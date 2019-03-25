/*
 * (C) Copyright 2017-2019 OpenVidu (https://openvidu.io/)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

package io.openvidu.test.e2e.utils;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

public class MultimediaFileMetadata {

	private static final Logger log = LoggerFactory.getLogger(MultimediaFileMetadata.class);

	private CommandLineExecutor executer = new CommandLineExecutor();
	private JsonParser parser = new JsonParser();

	private JsonObject json;
	private JsonObject formatJson;
	private JsonObject audioStreamJson;
	private JsonObject videoStreamJson;

	private double duration;
	private String format;
	private long bitrate;
	private boolean hasAudio;
	private boolean hasVideo;
	private long audioSampleRate;
	private String audioDecoder;
	private String videoDecoder;
	private int videoWidth;
	private int videoHeight;
	private int framerate;

	public MultimediaFileMetadata(String fileAbsolutePath) throws IOException {

		log.info("Extracting media metadata info from file {}", fileAbsolutePath);

		this.json = this.executeFfprobeCommand(fileAbsolutePath);
		this.formatJson = json.get("format").getAsJsonObject();

		if (formatJson.get("duration") == null) {
			// Webm file has not been properly closed (i.e. media server stopped)
			this.fixWebmFile(fileAbsolutePath);
			this.json = this.executeFfprobeCommand(fileAbsolutePath);
			this.formatJson = json.get("format").getAsJsonObject();
		}

		JsonArray streams = json.get("streams").getAsJsonArray();

		streams.forEach(e -> { // Only supposed for 2 streams max
			String codecType = e.getAsJsonObject().get("codec_type").getAsString();
			switch (codecType) {
			case "audio":
				this.audioStreamJson = e.getAsJsonObject();
				break;
			case "video":
				this.videoStreamJson = e.getAsJsonObject();
				break;
			}
		});

		this.duration = formatJson.get("duration").getAsDouble();
		this.format = formatJson.get("format_name").getAsString();
		this.bitrate = formatJson.get("bit_rate").getAsLong();
		this.hasAudio = this.audioStreamJson != null;
		this.hasVideo = this.videoStreamJson != null;

		if (this.hasAudio) {
			this.audioDecoder = this.audioStreamJson.get("codec_name").getAsString();
			this.audioSampleRate = this.audioStreamJson.get("sample_rate").getAsLong();
		}

		if (this.hasVideo) {
			this.videoDecoder = this.videoStreamJson.get("codec_name").getAsString();
			this.videoWidth = this.videoStreamJson.get("width").getAsInt();
			this.videoHeight = this.videoStreamJson.get("height").getAsInt();

			String frameRate = this.videoStreamJson.get("r_frame_rate").getAsString();
			String[] frameRateParts = frameRate.split("/");
			this.framerate = Integer.parseInt(frameRateParts[0]) / Integer.parseInt(frameRateParts[1]);
		}

		log.info("Media metadata for {}: {}", fileAbsolutePath, this.toString());
	}

	public double getDuration() {
		return duration;
	}

	public String getFormat() {
		return format;
	}

	public long getBitrate() {
		return bitrate;
	}

	public boolean hasAudio() {
		return hasAudio;
	}

	public boolean hasVideo() {
		return hasVideo;
	}

	public long getAudioSampleRate() {
		return audioSampleRate;
	}

	public String getAudioDecoder() {
		return audioDecoder;
	}

	public String getVideoDecoder() {
		return videoDecoder;
	}

	public int getVideoWidth() {
		return videoWidth;
	}

	public int getVideoHeight() {
		return videoHeight;
	}

	public int getFrameRate() {
		return framerate;
	}

	private JsonObject executeFfprobeCommand(String filePath) {
		log.info("Running ffprobe command on '{}'", filePath);
		String cmd = "ffprobe -v quiet -print_format json -show_format -show_streams " + filePath;
		return this.parser.parse(this.executer.executeCommand(cmd)).getAsJsonObject();
	}

	private void fixWebmFile(String filePath) throws IOException {
		Path source = Paths.get(filePath);
		String pathCopy = null;
		pathCopy = Files.move(source, source.resolveSibling("COPY.webm")).toString();
		log.warn("Fixing file '{}' with ffmpeg", filePath);
		String cmd = "ffmpeg -i " + pathCopy + " -vcodec copy -acodec copy " + filePath;
		this.executer.executeCommand(cmd);
		new File(pathCopy).delete();
	}

	@Override
	public String toString() {
		return "{duration=" + this.duration + ", format=" + this.format + ", bitrate=" + this.bitrate + ", hasAudio="
				+ this.hasAudio + ", hasVideo=" + this.hasVideo + ", audioSampleRate=" + this.audioSampleRate
				+ ", audioDecoder=" + this.audioDecoder + ", videoDecoder=" + this.videoDecoder + ", videoWidth="
				+ this.videoWidth + ", videoHeight=" + this.videoHeight + ", framerate=" + this.framerate + "}";
	}

}
