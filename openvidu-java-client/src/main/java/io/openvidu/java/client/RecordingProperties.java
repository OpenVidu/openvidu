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

package io.openvidu.java.client;

/**
 * See
 * {@link io.openvidu.java.client.OpenVidu#startRecording(String, RecordingProperties)}
 */
public class RecordingProperties {

	private String name;
	private Recording.OutputMode outputMode;
	private RecordingLayout recordingLayout;
	private String customLayout;
	private String resolution;
	private boolean hasAudio;
	private boolean hasVideo;

	/**
	 * Builder for {@link io.openvidu.java.client.RecordingProperties}
	 */
	public static class Builder {

		private String name = "";
		private Recording.OutputMode outputMode = Recording.OutputMode.COMPOSED;
		private RecordingLayout recordingLayout = RecordingLayout.BEST_FIT;
		private String customLayout = "";
		private String resolution = "1920x1080";
		private boolean hasAudio = true;
		private boolean hasVideo = true;

		/**
		 * Builder for {@link io.openvidu.java.client.RecordingProperties}
		 */
		public RecordingProperties build() {
			return new RecordingProperties(this.name, this.outputMode, this.recordingLayout, this.customLayout,
					this.resolution, this.hasAudio, this.hasVideo);
		}

		/**
		 * Call this method to set the name of the video file. You can access this same
		 * value in your clients on recording events (<code>recordingStarted</code>,
		 * <code>recordingStopped</code>)
		 */
		public RecordingProperties.Builder name(String name) {
			this.name = name;
			return this;
		}

		/**
		 * Call this method to set the mode of recording: COMPOSED for a single archive
		 * in a grid layout or INDIVIDUAL for one archive for each stream
		 */
		public RecordingProperties.Builder outputMode(Recording.OutputMode outputMode) {
			this.outputMode = outputMode;
			return this;
		}

		/**
		 * Call this method to set the layout to be used in the recording. Will only
		 * have effect if
		 * {@link io.openvidu.java.client.RecordingProperties.Builder#outputMode(Recording.OutputMode)}
		 * has been called with value
		 * {@link io.openvidu.java.client.Recording.OutputMode#COMPOSED}
		 */
		public RecordingProperties.Builder recordingLayout(RecordingLayout layout) {
			this.recordingLayout = layout;
			return this;
		}

		/**
		 * If setting
		 * {@link io.openvidu.java.client.RecordingProperties.Builder#recordingLayout(RecordingLayout)}
		 * to {@link io.openvidu.java.client.RecordingLayout#CUSTOM} you can call this
		 * method to set the relative path to the specific custom layout you want to
		 * use.<br>
		 * Will only have effect if
		 * {@link io.openvidu.java.client.RecordingProperties.Builder#outputMode(Recording.OutputMode)}
		 * has been called with value
		 * {@link io.openvidu.java.client.Recording.OutputMode#COMPOSED}.<br>
		 * See <a href=
		 * "https://openvidu.io/docs/advanced-features/recording#custom-recording-layouts"
		 * target="_blank">Custom recording layouts</a> to learn more
		 */
		public RecordingProperties.Builder customLayout(String path) {
			this.customLayout = path;
			return this;
		}

		/**
		 * Call this method to specify the recording resolution. Will only have effect
		 * if
		 * {@link io.openvidu.java.client.RecordingProperties.Builder#outputMode(Recording.OutputMode)}
		 * has been called with value
		 * {@link io.openvidu.java.client.Recording.OutputMode#COMPOSED}. For
		 * {@link io.openvidu.java.client.Recording.OutputMode#INDIVIDUAL} all
		 * individual video files will have the native resolution of the published
		 * stream
		 */
		public RecordingProperties.Builder resolution(String resolution) {
			this.resolution = resolution;
			return this;
		}

		/**
		 * Call this method to specify whether or not to record the audio track
		 */
		public RecordingProperties.Builder hasAudio(boolean hasAudio) {
			this.hasAudio = true;
			return this;
		}

		/**
		 * Call this method to specify whether or not to record the video track
		 */
		public RecordingProperties.Builder hasVideo(boolean hasVideo) {
			this.hasVideo = true;
			return this;
		}

	}

	protected RecordingProperties(String name, Recording.OutputMode outputMode, RecordingLayout layout,
			String customLayout, String resolution, boolean hasAudio, boolean hasVideo) {
		this.name = name;
		this.outputMode = outputMode;
		this.recordingLayout = layout;
		this.customLayout = customLayout;
		this.resolution = resolution;
		this.hasAudio = hasAudio;
		this.hasVideo = hasVideo;
	}

	/**
	 * Defines the name you want to give to the video file. You can access this same
	 * value in your clients on recording events (<code>recordingStarted</code>,
	 * <code>recordingStopped</code>)
	 */
	public String name() {
		return this.name;
	}

	/**
	 * Defines the mode of recording: COMPOSED for a single archive in a grid layout
	 * or INDIVIDUAL for one archive for each stream
	 */
	public Recording.OutputMode outputMode() {
		return this.outputMode;
	}

	/**
	 * Defines the layout to be used in the recording
	 */
	public RecordingLayout recordingLayout() {
		return this.recordingLayout;
	}

	/**
	 * If {@link io.openvidu.java.client.RecordingProperties#recordingLayout()} is
	 * set to {@link io.openvidu.java.client.RecordingLayout#CUSTOM}, this property
	 * defines the relative path to the specific custom layout you want to use. See
	 * <a href=
	 * "https://openvidu.io/docs/advanced-features/recording#custom-recording-layouts"
	 * target="_blank">Custom recording layouts</a> to learn more
	 */
	public String customLayout() {
		return this.customLayout;
	}

	/**
	 * Defines the resolution of the recorded video
	 */
	public String resolution() {
		return this.resolution;
	}

	/**
	 * Defines if the recording has an audio track or not
	 */
	public boolean hasAudio() {
		return this.hasAudio;
	}

	/**
	 * Defines if the recording has a video track or not
	 */
	public boolean hasVideo() {
		return this.hasVideo;
	}

}
