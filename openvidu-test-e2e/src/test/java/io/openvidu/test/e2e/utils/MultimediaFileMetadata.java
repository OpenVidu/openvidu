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
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import ws.schild.jave.AudioInfo;
import ws.schild.jave.EncoderException;
import ws.schild.jave.MultimediaInfo;
import ws.schild.jave.MultimediaObject;
import ws.schild.jave.VideoInfo;
import ws.schild.jave.VideoSize;

public class MultimediaFileMetadata {

	private static final Logger log = LoggerFactory.getLogger(MultimediaFileMetadata.class);

	private File f;
	private MultimediaInfo mediaInfo;
	private AudioInfo audioInfo;
	private VideoInfo videoInfo;
	private VideoSize videoSize;

	public MultimediaFileMetadata(File f) {
		this.f = f;
	}

	public void processMultimediaFile() {
		try {
			this.mediaInfo = new MultimediaObject(f).getInfo();
			this.audioInfo = mediaInfo.getAudio();
			this.videoInfo = mediaInfo.getVideo();
			if (videoInfo != null) {
				this.videoSize = videoInfo.getSize();
			}
		} catch (EncoderException e) {
			log.error("Error getting multimedia information from file {}. Error: {}", f.getAbsolutePath(),
					e.getMessage());
			log.info(System.getProperty("user.name"));
			this.executeCommand("ls -la /tmp/jave/");
		}
	}

	public long getDuration() {
		return mediaInfo.getDuration();
	}

	public String getFormat(String format) {
		return mediaInfo.getFormat();
	}

	public boolean hasAudio() {
		return audioInfo != null;
	}

	public boolean hasVideo() {
		return videoInfo != null;
	}

	public boolean hasAudioAndVideo() {
		return this.hasAudio() && this.hasVideo();
	}

	public Integer getAudioBitrate() {
		if (audioInfo != null) {
			return audioInfo.getBitRate();
		} else {
			return null;
		}
	}

	public Integer getVideoBitrate() {
		if (videoInfo != null) {
			return videoInfo.getBitRate();
		} else {
			return null;
		}
	}

	public String getAudioDecoder() {
		return audioInfo.getDecoder();
	}

	public String getVideoDecoder() {
		return videoInfo.getDecoder();
	}

	public Integer getVideoWidth() {
		if (videoSize != null) {
			return videoSize.getWidth();
		} else {
			return null;
		}
	}

	public Integer getVideoHeight() {
		if (videoSize != null) {
			return videoSize.getHeight();
		} else {
			return null;
		}
	}

	public Integer getFrameRate() {
		if (videoInfo != null) {
			return Math.round(videoInfo.getFrameRate());
		} else {
			return null;
		}
	}

	private void executeCommand(String command) {
		try {
			Thread.sleep(500);
			String s;
			Process p;
			p = Runtime.getRuntime().exec(command);
			BufferedReader br = new BufferedReader(new InputStreamReader(p.getInputStream()));
			while ((s = br.readLine()) != null)
				log.info("LINE: " + s);
			p.waitFor();
			System.out.println("EXIT VALUE: " + p.exitValue());
			p.destroy();
		} catch (IOException | InterruptedException e1) {
			log.info("Error updateing permissions of jave executable. Error: {}" + e1.getMessage());
		}
	}

}
