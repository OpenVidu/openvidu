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

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

public class MultimediaFileMetadata {

	private static final Logger log = LoggerFactory.getLogger(MultimediaFileMetadata.class);

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

	public MultimediaFileMetadata(String fileAbsolutePath) {

		log.info("Extracting media metadata info from file {}", fileAbsolutePath);

		this.json = this.executeFfprobeCommand(fileAbsolutePath);
		this.formatJson = json.get("format").getAsJsonObject();
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
		String jsonLines = "";
		try {
			String s;
			Process p;
			p = Runtime.getRuntime().exec("ffprobe -v quiet -print_format json -show_format -show_streams " + filePath);
			BufferedReader br = new BufferedReader(new InputStreamReader(p.getInputStream()));
			while ((s = br.readLine()) != null) {
				jsonLines += s;
			}
			p.waitFor();
			p.destroy();
		} catch (IOException | InterruptedException e1) {
			log.info("Error updateing permissions of jave executable. Error: {}" + e1.getMessage());
		}
		JsonParser parser = new JsonParser();
		return parser.parse(jsonLines).getAsJsonObject();
	}

	@Override
	public String toString() {
		return "{duration=" + this.duration + ", format=" + this.format + ", bitrate=" + this.bitrate + ", hasAudio="
				+ this.hasAudio + ", hasVideo=" + this.hasVideo + ", audioSampleRate=" + this.audioSampleRate
				+ ", audioDecoder=" + this.audioDecoder + ", videoDecoder=" + this.videoDecoder + ", videoWidth="
				+ this.videoWidth + ", videoHeight=" + this.videoHeight + ", framerate=" + this.framerate + "}";
	}

}
