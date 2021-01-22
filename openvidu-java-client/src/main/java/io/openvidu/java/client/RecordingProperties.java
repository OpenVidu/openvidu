/*
 * (C) Copyright 2017-2020 OpenVidu (https://openvidu.io)
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
	private long shmSize; // For COMPOSED recording
	private String mediaNode;

	/**
	 * Builder for {@link io.openvidu.java.client.RecordingProperties}
	 */
	public static class Builder {

		private String name = "";
		private Recording.OutputMode outputMode;
		private RecordingLayout recordingLayout;
		private String customLayout;
		private String resolution;
		private boolean hasAudio = true;
		private boolean hasVideo = true;
		private long shmSize = 536870912L;
		private String mediaNode;

		/**
		 * Builder for {@link io.openvidu.java.client.RecordingProperties}
		 */
		public RecordingProperties build() {
			return new RecordingProperties(this.name, this.outputMode, this.recordingLayout, this.customLayout,
					this.resolution, this.hasAudio, this.hasVideo, this.shmSize, this.mediaNode);
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
		 * {@link io.openvidu.java.client.Recording.OutputMode#COMPOSED} or
		 * {@link io.openvidu.java.client.Recording.OutputMode#COMPOSED_QUICK_START}
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
		 * {@link io.openvidu.java.client.RecordingProperties.Builder#outputMode(Recording.OutputMode)
		 * Builder.outputMode()} has been called with value
		 * {@link io.openvidu.java.client.Recording.OutputMode#COMPOSED
		 * OutputMode.COMPOSED} or
		 * {@link io.openvidu.java.client.Recording.OutputMode#COMPOSED_QUICK_START
		 * OutputMode.COMPOSED_QUICK_START}.<br>
		 * See <a href=
		 * "https://docs.openvidu.io/en/stable/advanced-features/recording#custom-recording-layouts"
		 * target="_blank">Custom recording layouts</a> to learn more
		 */
		public RecordingProperties.Builder customLayout(String path) {
			this.customLayout = path;
			return this;
		}

		/**
		 * Call this method to specify the recording resolution. Must be a string with
		 * format "WIDTHxHEIGHT", being both WIDTH and HEIGHT the number of pixels
		 * between 100 and 1999.<br>
		 * Will only have effect if
		 * {@link io.openvidu.java.client.RecordingProperties.Builder#outputMode(Recording.OutputMode)
		 * Builder.outputMode()} has been called with value
		 * {@link io.openvidu.java.client.Recording.OutputMode#COMPOSED
		 * OutputMode.COMPOSED} or
		 * {@link io.openvidu.java.client.Recording.OutputMode#COMPOSED_QUICK_START
		 * OutputMode.COMPOSED_QUICK_START}. For
		 * {@link io.openvidu.java.client.Recording.OutputMode#INDIVIDUAL
		 * OutputMode.INDIVIDUAL} all individual video files will have the native
		 * resolution of the published stream
		 */
		public RecordingProperties.Builder resolution(String resolution) {
			this.resolution = resolution;
			return this;
		}

		/**
		 * Call this method to specify whether to record audio or not. Cannot be set to
		 * false at the same time as
		 * {@link RecordingProperties.Builder#hasVideo(boolean)}
		 */
		public RecordingProperties.Builder hasAudio(boolean hasAudio) {
			this.hasAudio = hasAudio;
			return this;
		}

		/**
		 * Call this method to specify whether to record video or not. Cannot be set to
		 * false at the same time as
		 * {@link RecordingProperties.Builder#hasAudio(boolean)}
		 */
		public RecordingProperties.Builder hasVideo(boolean hasVideo) {
			this.hasVideo = hasVideo;
			return this;
		}

		/**
		 * If COMPOSED recording, call this method to specify the amount of shared
		 * memory reserved for the recording process in bytes. Minimum 134217728 (128
		 * MB). Property ignored if INDIVIDUAL recording
		 */
		public RecordingProperties.Builder shmSize(long shmSize) {
			this.shmSize = shmSize;
			return this;
		}

		/**
		 * <a href="https://docs.openvidu.io/en/stable/openvidu-pro/" target="_blank"
		 * style="display: inline-block; background-color: rgb(0, 136, 170); color:
		 * white; font-weight: bold; padding: 0px 5px; margin-right: 5px; border-radius:
		 * 3px; font-size: 13px; line-height:21px; font-family: Montserrat,
		 * sans-serif">PRO</a> Call this method to force the recording to be hosted in
		 * the Media Node with identifier <code>mediaNodeId</code>. This property only
		 * applies to COMPOSED recordings and is ignored for INDIVIDUAL recordings, that
		 * are always hosted in the same Media Node hosting its Session
		 */
		public RecordingProperties.Builder mediaNode(String mediaNodeId) {
			this.mediaNode = mediaNodeId;
			return this;
		}

	}

	protected RecordingProperties(String name, Recording.OutputMode outputMode, RecordingLayout layout,
			String customLayout, String resolution, boolean hasAudio, boolean hasVideo, long shmSize,
			String mediaNode) {
		this.name = name;
		this.outputMode = outputMode;
		this.recordingLayout = layout;
		this.customLayout = customLayout;
		this.resolution = resolution;
		this.hasAudio = hasAudio;
		this.hasVideo = hasVideo;
		this.shmSize = shmSize;
		this.mediaNode = mediaNode;
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
	 * Defines the mode of recording: {@link Recording.OutputMode#COMPOSED} or
	 * {@link io.openvidu.java.client.Recording.OutputMode#COMPOSED_QUICK_START} for
	 * a single archive in a grid layout or {@link Recording.OutputMode#INDIVIDUAL}
	 * for one archive for each stream.<br>
	 * <br>
	 * 
	 * Default to {@link Recording.OutputMode#COMPOSED OutputMode.COMPOSED}
	 */
	public Recording.OutputMode outputMode() {
		return this.outputMode;
	}

	/**
	 * Defines the layout to be used in the recording.<br>
	 * Will only have effect if
	 * {@link io.openvidu.java.client.RecordingProperties.Builder#outputMode(Recording.OutputMode)
	 * Builder.outputMode()} has been called with value
	 * {@link Recording.OutputMode#COMPOSED OutputMode.COMPOSED} or
	 * {@link io.openvidu.java.client.Recording.OutputMode#COMPOSED_QUICK_START
	 * OutputMode.COMPOSED_QUICK_START}.<br>
	 * <br>
	 * 
	 * Default to {@link RecordingLayout#BEST_FIT RecordingLayout.BEST_FIT}
	 */
	public RecordingLayout recordingLayout() {
		return this.recordingLayout;
	}

	/**
	 * If {@link io.openvidu.java.client.RecordingProperties#recordingLayout()} is
	 * set to {@link io.openvidu.java.client.RecordingLayout#CUSTOM}, this property
	 * defines the relative path to the specific custom layout you want to use.<br>
	 * See <a href=
	 * "https://docs.openvidu.io/en/stable/advanced-features/recording#custom-recording-layouts"
	 * target="_blank">Custom recording layouts</a> to learn more
	 */
	public String customLayout() {
		return this.customLayout;
	}

	/**
	 * Defines the resolution of the recorded video.<br>
	 * Will only have effect if
	 * {@link io.openvidu.java.client.RecordingProperties.Builder#outputMode(Recording.OutputMode)}
	 * has been called with value
	 * {@link io.openvidu.java.client.Recording.OutputMode#COMPOSED} or
	 * {@link io.openvidu.java.client.Recording.OutputMode#COMPOSED_QUICK_START}.
	 * For {@link io.openvidu.java.client.Recording.OutputMode#INDIVIDUAL} all
	 * individual video files will have the native resolution of the published
	 * stream.<br>
	 * <br>
	 * 
	 * Default to "1920x1080"
	 */
	public String resolution() {
		return this.resolution;
	}

	/**
	 * Defines whether to record audio or not. Cannot be set to false at the same
	 * time as {@link RecordingProperties#hasVideo()}.<br>
	 * <br>
	 * 
	 * Default to true
	 */
	public boolean hasAudio() {
		return this.hasAudio;
	}

	/**
	 * Defines whether to record video or not. Cannot be set to false at the same
	 * time as {@link RecordingProperties#hasAudio()}.<br>
	 * <br>
	 * 
	 * Default to true
	 */
	public boolean hasVideo() {
		return this.hasVideo;
	}

	/**
	 * If COMPOSED recording, the amount of shared memory reserved for the recording
	 * process in bytes. Minimum 134217728 (128MB). Property ignored if INDIVIDUAL
	 * recording<br>
	 * <br>
	 * 
	 * Default to 536870912 (512 MB)
	 */
	public long shmSize() {
		return this.shmSize;
	}

	/**
	 * <a href="https://docs.openvidu.io/en/stable/openvidu-pro/" target="_blank"
	 * style="display: inline-block; background-color: rgb(0, 136, 170); color:
	 * white; font-weight: bold; padding: 0px 5px; margin-right: 5px; border-radius:
	 * 3px; font-size: 13px; line-height:21px; font-family: Montserrat,
	 * sans-serif">PRO</a> The Media Node where to host the recording. The default
	 * option if this property is not defined is the same Media Node hosting the
	 * Session to record. This property only applies to COMPOSED recordings and is
	 * ignored for INDIVIDUAL recordings
	 */
	public String mediaNode() {
		return this.mediaNode;
	}

}
