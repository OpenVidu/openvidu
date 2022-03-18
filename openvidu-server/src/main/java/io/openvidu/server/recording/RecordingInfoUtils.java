/*
 * (C) Copyright 2017-2022 OpenVidu (https://openvidu.io)
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

package io.openvidu.server.recording;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.IOException;

import com.google.gson.JsonArray;
import com.google.gson.JsonIOException;
import com.google.gson.JsonObject;
import com.google.gson.JsonSyntaxException;

import io.openvidu.client.OpenViduException;
import io.openvidu.client.OpenViduException.Code;
import io.openvidu.server.utils.JsonUtils;

public class RecordingInfoUtils {

	private JsonObject json;
	private JsonObject jsonFormat;
	private JsonObject videoStream;
	private JsonObject audioStream;

	private String infoFilePath;

	public RecordingInfoUtils(String infoFilePath) throws FileNotFoundException, IOException, OpenViduException {

		this.infoFilePath = infoFilePath;

		try {
			this.json = new JsonUtils().fromFileToJsonObject(infoFilePath);
		} catch (JsonIOException | JsonSyntaxException e) {
			// Recording metadata from ffprobe is not a JSON: video file is corrupted
			throw new OpenViduException(Code.RECORDING_FILE_EMPTY_ERROR, "The recording file is corrupted");
		}
		if (this.json.size() == 0) {
			// Recording metadata from ffprobe is an empty JSON
			throw new OpenViduException(Code.RECORDING_FILE_EMPTY_ERROR, "The recording file is empty");
		}

		this.jsonFormat = json.get("format").getAsJsonObject();
		JsonArray streams = json.get("streams").getAsJsonArray();

		for (int i = 0; i < streams.size(); i++) {
			JsonObject stream = streams.get(i).getAsJsonObject();
			if ("video".equals(stream.get("codec_type").getAsString())) {
				this.videoStream = stream;
			} else if ("audio".equals(stream.get("codec_type").getAsString())) {
				this.audioStream = stream;
			}
		}
	}

	public double getDurationInSeconds() {
		return jsonFormat.get("duration").getAsDouble();
	}

	public long getSizeInBytes() {
		return jsonFormat.get("size").getAsLong();
	}

	public int getNumberOfStreams() {
		return jsonFormat.get("nb_streams").getAsInt();
	}

	public int getBitRate() {
		return ((jsonFormat.get("bit_rate").getAsInt()) / 1000);
	}

	public boolean hasVideo() {
		return this.videoStream != null;
	}

	public boolean hasAudio() {
		return this.audioStream != null;
	}

	public int videoWidth() {
		return videoStream.get("width").getAsInt();
	}

	public int videoHeight() {
		return videoStream.get("height").getAsInt();
	}

	public int getVideoFramerate() {
		String frameRate = videoStream.get("r_frame_rate").getAsString();
		String[] frameRateParts = frameRate.split("/");

		return Integer.parseInt(frameRateParts[0]) / Integer.parseInt(frameRateParts[1]);
	}

	public String getVideoCodec() {
		return videoStream.get("codec_name").toString();
	}

	public String getLongVideoCodec() {
		return videoStream.get("codec_long_name").toString();
	}

	public String getAudioCodec() {
		return audioStream.get("codec_name").toString();
	}

	public String getLongAudioCodec() {
		return audioStream.get("codec_long_name").toString();
	}

	public boolean deleteFilePath() {
		return new File(this.infoFilePath).delete();
	}

}
