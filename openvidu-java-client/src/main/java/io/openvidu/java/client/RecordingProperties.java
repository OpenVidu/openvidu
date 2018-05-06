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

package io.openvidu.java.client;

public class RecordingProperties {

	private String name;
	private RecordingLayout recordingLayout;
	private String customLayout;

	public static class Builder {

		private String name = "";
		private RecordingLayout recordingLayout;
		private String customLayout;

		/**
		 * Builder for {@link io.openvidu.java.client.RecordingProperties}
		 */
		public RecordingProperties build() {
			return new RecordingProperties(this.name, this.recordingLayout, this.customLayout);
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
		 * Call this method to set the layout to be used in the recording
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
		 * use. See <a href=
		 * "https://openvidu.io/docs/advanced-features/recording#custom-recording-layouts"
		 * target="_blank">Custom recording layouts</a> to learn more
		 */
		public RecordingProperties.Builder customLayout(String path) {
			this.customLayout = path;
			return this;
		}

	}

	protected RecordingProperties(String name, RecordingLayout layout, String customLayout) {
		this.name = name;
		this.recordingLayout = layout;
		this.customLayout = customLayout;
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

}
