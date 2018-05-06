/*
 * (C) Copyright 2017-2018 OpenVidu (https://openvidu.io/)
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

import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.IOException;

import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import org.json.simple.parser.ParseException;

import io.openvidu.client.OpenViduException;
import io.openvidu.client.OpenViduException.Code;

public class RecordingInfoUtils {

	private JSONParser parser;
	private JSONObject json;
	private JSONObject jsonFormat;
	private JSONObject videoStream;
	private JSONObject audioStream;

	public RecordingInfoUtils(String fullVideoPath)
			throws FileNotFoundException, IOException, ParseException, OpenViduException {

		this.parser = new JSONParser();
		this.json = (JSONObject) parser.parse(new FileReader(fullVideoPath));

		if (json.isEmpty()) {
			// Recording metadata from ffprobe is empty: video file is corrupted or empty
			throw new OpenViduException(Code.RECORDING_FILE_EMPTY_ERROR, "The recording file is empty or corrupted");
		}

		this.jsonFormat = (JSONObject) json.get("format");

		JSONArray streams = (JSONArray) json.get("streams");

		for (int i = 0; i < streams.size(); i++) {
			JSONObject stream = (JSONObject) streams.get(i);
			if ("video".equals(stream.get("codec_type").toString())) {
				this.videoStream = stream;
			} else if ("audio".equals(stream.get("codec_type").toString())) {
				this.audioStream = stream;
			}
		}

	}

	public double getDurationInSeconds() {
		return Double.parseDouble(jsonFormat.get("duration").toString());
	}

	public int getSizeInBytes() {
		return Integer.parseInt(jsonFormat.get("size").toString());
	}

	public int getNumberOfStreams() {
		return Integer.parseInt(jsonFormat.get("nb_streams").toString());
	}

	public int getBitRate() {
		return (Integer.parseInt(jsonFormat.get("bit_rate").toString()) / 1000);
	}

	public boolean hasVideo() {
		return this.videoStream != null;
	}

	public boolean hasAudio() {
		return this.audioStream != null;
	}

	public int videoWidth() {
		return Integer.parseInt(videoStream.get("width").toString());
	}

	public int videoHeight() {
		return Integer.parseInt(videoStream.get("height").toString());
	}

	public int getVideoFramerate() {
		String frameRate = videoStream.get("r_frame_rate").toString();
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

}
