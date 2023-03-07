package io.openvidu.test.browsers.utils;

import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.math.RoundingMode;
import java.text.DecimalFormat;
import java.util.Arrays;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

import javax.imageio.ImageIO;

import org.jcodec.api.FrameGrab;
import org.jcodec.api.JCodecException;
import org.jcodec.common.model.Picture;
import org.jcodec.scale.AWTUtil;
import org.junit.jupiter.api.Assertions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.stream.JsonReader;

import io.openvidu.java.client.Recording;

public class RecordingUtils {

	protected static final Logger log = LoggerFactory.getLogger(RecordingUtils.class);

	public boolean recordedGreenFileFine(File file, Recording recording) throws IOException {
		return this.recordedFileFine(file, recording, RecordingUtils::checkVideoAverageRgbGreen);
	}

	public boolean recordedRedFileFine(File file, Recording recording) throws IOException {
		return this.recordedFileFine(file, recording, RecordingUtils::checkVideoAverageRgbRed);
	}

	private boolean recordedFileFine(File file, Recording recording,
			Function<Map<String, Long>, Boolean> colorCheckFunction) throws IOException {
		this.checkMultimediaFile(file, recording.hasAudio(), recording.hasVideo(), recording.getDuration(),
				recording.getResolution(), recording.getFrameRate(), "aac", "h264", true);

		boolean isFine = false;
		Picture frame;
		try {
			// Get a frame at 75% duration and check that it has the expected color
			frame = FrameGrab.getFrameAtSec(file, (double) (recording.getDuration() * 0.75));
			BufferedImage image = AWTUtil.toBufferedImage(frame);
			Map<String, Long> colorMap = this.averageColor(image);

			String realResolution = image.getWidth() + "x" + image.getHeight();
			Assertions.assertEquals(recording.getResolution(), realResolution,
					"Resolution (" + recording.getResolution()
							+ ") of recording entity is not equal to real video resolution (" + realResolution + ")");

			log.info("Recording map color: {}", colorMap.toString());
			log.info("Recording frame below");
			System.out.println(bufferedImageToBase64PngString(image));
			isFine = colorCheckFunction.apply(colorMap);
		} catch (IOException | JCodecException e) {
			log.warn("Error getting frame from video recording: {}", e.getMessage());
			isFine = false;
		}
		return isFine;
	}

	public static boolean checkVideoAverageRgbGreen(Map<String, Long> rgb) {
		// GREEN color: {r < 15, g > 130, b <15}
		return (rgb.get("r") < 15) && (rgb.get("g") > 130) && (rgb.get("b") < 15);
	}

	public static boolean checkVideoAverageRgbGray(Map<String, Long> rgb) {
		// GRAY color: {r < 50, g < 50, b < 50} and the absolute difference between them
		// not greater than 2
		return (rgb.get("r") < 50) && (rgb.get("g") < 50) && (rgb.get("b") < 50)
				&& (Math.abs(rgb.get("r") - rgb.get("g")) <= 2) && (Math.abs(rgb.get("r") - rgb.get("b")) <= 2)
				&& (Math.abs(rgb.get("b") - rgb.get("g")) <= 2);
	}

	public static boolean checkVideoAverageRgbLightGray(Map<String, Long> rgb) {
		// GRAY color: {r [90,110], g [90,110], b [90,110]} and the absolute difference
		// between not greater than 10
		return (rgb.get("r") >= 90) && (rgb.get("g") >= 90) && (rgb.get("b") >= 90) && (rgb.get("r") <= 110)
				&& (rgb.get("g") <= 110) && (rgb.get("b") <= 110) && (Math.abs(rgb.get("r") - rgb.get("g")) <= 10)
				&& (Math.abs(rgb.get("r") - rgb.get("b")) <= 10) && (Math.abs(rgb.get("b") - rgb.get("g")) <= 10);
	}

	public static boolean checkVideoAverageRgbRed(Map<String, Long> rgb) {
		// RED color: {r > 240, g < 15, b <15}
		return (rgb.get("r") > 240) && (rgb.get("g") < 15) && (rgb.get("b") < 15);
	}

	private String bufferedImageToBase64PngString(BufferedImage image) {
		ByteArrayOutputStream bos = new ByteArrayOutputStream();
		String imageString = null;
		try {
			ImageIO.write(image, "png", bos);
			byte[] imageBytes = bos.toByteArray();
			imageString = "data:image/png;base64," + Base64.getEncoder().encodeToString(imageBytes);
			bos.close();
		} catch (IOException e) {
			e.printStackTrace();
		}
		return imageString;
	}

	public void checkIndividualRecording(String recPath, Recording recording, int numberOfVideoFiles,
			String audioDecoder, String videoDecoder, boolean checkAudio) throws IOException {

		// Should be only 2 files: zip and metadata
		File folder = new File(recPath);
		Assertions.assertEquals(2, folder.listFiles().length,
				"There are more than 2 files (ZIP and metadata) inside individual recording folder " + recPath + ": "
						+ Arrays.toString(folder.listFiles()));

		File file1 = new File(recPath + recording.getName() + ".zip");
		File file2 = new File(recPath + ".recording." + recording.getId());

		Assertions.assertTrue(file1.exists() && file1.length() > 0,
				"File " + file1.getAbsolutePath() + " does not exist or is empty");
		Assertions.assertTrue(file2.exists() && file2.length() > 0,
				"File " + file2.getAbsolutePath() + " does not exist or is empty");

		List<File> unzippedWebmFiles = new Unzipper().unzipFile(recPath, recording.getName() + ".zip");

		Assertions.assertEquals(numberOfVideoFiles, unzippedWebmFiles.size(),
				"Expecting " + numberOfVideoFiles + " videos inside ZIP file but " + unzippedWebmFiles.size()
						+ " found: " + unzippedWebmFiles.toString());

		File jsonSyncFile = new File(recPath + recording.getName() + ".json");
		Assertions.assertTrue(jsonSyncFile.exists() && jsonSyncFile.length() > 0,
				"JSON sync file " + jsonSyncFile.getAbsolutePath() + "does not exist or is empty");

		JsonObject jsonSyncMetadata;
		try {
			Gson gson = new Gson();
			JsonReader reader = new JsonReader(new FileReader(jsonSyncFile));
			jsonSyncMetadata = gson.fromJson(reader, JsonObject.class);
		} catch (Exception e) {
			log.error("Cannot read JSON sync metadata file from {}. Error: {}", jsonSyncFile.getAbsolutePath(),
					e.getMessage());
			Assertions.fail("Cannot read JSON sync metadata file from " + jsonSyncFile.getAbsolutePath());
			return;
		}

		long totalFileSize = 0;
		JsonArray syncArray = jsonSyncMetadata.get("files").getAsJsonArray();
		for (File webmFile : unzippedWebmFiles) {
			totalFileSize += webmFile.length();

			Assertions.assertTrue(webmFile.exists() && webmFile.length() > 0,
					"WEBM file " + webmFile.getAbsolutePath() + " does not exist or is empty");

			double durationInSeconds = 0;
			boolean found = false;
			for (int i = 0; i < syncArray.size(); i++) {
				JsonObject j = syncArray.get(i).getAsJsonObject();
				if (webmFile.getName().contains(j.get("streamId").getAsString())) {
					durationInSeconds = (double) (j.get("endTimeOffset").getAsDouble()
							- j.get("startTimeOffset").getAsDouble()) / 1000;
					found = true;
					break;
				}
			}

			Assertions.assertTrue(found,
					"Couldn't find in JSON sync object information for webm file " + webmFile.getName());

			log.info("Duration of {} according to sync metadata json file: {} s", webmFile.getName(),
					durationInSeconds);
			this.checkMultimediaFile(webmFile, recording.hasAudio(), recording.hasVideo(), durationInSeconds,
					recording.getResolution(), recording.getFrameRate(), audioDecoder, videoDecoder, checkAudio);
			webmFile.delete();
		}

		Assertions.assertEquals(recording.getSize(), totalFileSize, "Size of recording entity ("
				+ recording.getSessionId() + ") is not equal to real file size (" + totalFileSize + ")");

		jsonSyncFile.delete();
	}

	public void checkMultimediaFile(File file, boolean hasAudio, boolean hasVideo, double duration, String resolution,
			Integer frameRate, String audioDecoder, String videoDecoder, boolean checkAudio) throws IOException {
		// Check tracks, duration, resolution, framerate and decoders
		MultimediaFileMetadata metadata = new MultimediaFileMetadata(file.getAbsolutePath());

		if (hasVideo) {
			if (checkAudio) {
				if (hasAudio) {
					Assertions.assertTrue(metadata.hasAudio() && metadata.hasVideo(),
							"Media file " + file.getAbsolutePath() + " should have audio");
					Assertions.assertTrue(metadata.getAudioDecoder().toLowerCase().contains(audioDecoder));
				} else {
					Assertions.assertTrue(metadata.hasVideo(),
							"Media file " + file.getAbsolutePath() + " should have video");
					Assertions.assertFalse(metadata.hasAudio());
				}
			}
			if (resolution != null) {
				Assertions.assertEquals(resolution, metadata.getVideoWidth() + "x" + metadata.getVideoHeight());
			}
			if (frameRate != null) {
				Assertions.assertEquals(frameRate.intValue(), metadata.getFrameRate());
			}
			Assertions.assertTrue(metadata.getVideoDecoder().toLowerCase().contains(videoDecoder));
		} else if (hasAudio && checkAudio) {
			Assertions.assertTrue(metadata.hasAudio());
			Assertions.assertFalse(metadata.hasVideo());
			Assertions.assertTrue(metadata.getAudioDecoder().toLowerCase().contains(audioDecoder));
		} else {
			Assertions.fail("Cannot check a file witho no audio and no video");
		}
		// Check duration with 1 decimal precision
		DecimalFormat df = new DecimalFormat("#0.0");
		df.setRoundingMode(RoundingMode.UP);
		log.info("Duration of {} according to ffmpeg: {} s", file.getName(), metadata.getDuration());
		log.info("Duration of {} according to 'duration' property: {} s", file.getName(), duration);
		log.info("Difference in s duration: {}", Math.abs(metadata.getDuration() - duration));
		final double difference = 10;
		Assertions.assertTrue(Math.abs((metadata.getDuration() - duration)) < difference,
				"Difference between recording entity duration (" + duration + ") and real video duration ("
						+ metadata.getDuration() + ") is greater than " + difference + "  in file " + file.getName());
	}

	public boolean thumbnailIsFine(File file, Function<Map<String, Long>, Boolean> colorCheckFunction) {
		boolean isFine = false;
		BufferedImage image = null;
		try {
			image = ImageIO.read(file);
		} catch (IOException e) {
			log.error(e.getMessage());
			return false;
		}
		log.info("Recording thumbnail dimensions: {}x{}", image.getWidth(), image.getHeight());
		Map<String, Long> colorMap = this.averageColor(image);
		log.info("Thumbnail map color: {}", colorMap.toString());
		isFine = colorCheckFunction.apply(colorMap);
		if (!isFine) {
			try {
				log.error("Thumbnail is not fine. Printed below");
				System.out.println(bufferedImageToBase64PngString(ImageIO.read(file)));
			} catch (IOException e) {
				e.printStackTrace();
			}
		}
		return isFine;
	}

	private Map<String, Long> averageColor(BufferedImage bi) {
		int x0 = 0;
		int y0 = 0;
		int w = bi.getWidth();
		int h = bi.getHeight();
		int x1 = x0 + w;
		int y1 = y0 + h;
		long sumr = 0, sumg = 0, sumb = 0;
		for (int x = x0; x < x1; x++) {
			for (int y = y0; y < y1; y++) {
				Color pixel = new Color(bi.getRGB(x, y));
				sumr += pixel.getRed();
				sumg += pixel.getGreen();
				sumb += pixel.getBlue();
			}
		}
		int num = w * h;
		Map<String, Long> colorMap = new HashMap<>();
		colorMap.put("r", (long) (sumr / num));
		colorMap.put("g", (long) (sumg / num));
		colorMap.put("b", (long) (sumb / num));
		return colorMap;
	}

}
