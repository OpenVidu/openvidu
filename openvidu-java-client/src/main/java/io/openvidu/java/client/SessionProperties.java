/*
 * (C) Copyright 2017-2018 OpenVidu (http://openvidu.io/)
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

public class SessionProperties {

	private MediaMode mediaMode;
	private RecordingMode recordingMode;
	private RecordingLayout defaultRecordingLayout;
	private String defaultCustomLayout;

	public static class Builder {

		private MediaMode mediaMode = MediaMode.ROUTED;
		private RecordingMode recordingMode = RecordingMode.MANUAL;
		private RecordingLayout defaultRecordingLayout = RecordingLayout.BEST_FIT;
		private String defaultCustomLayout = "";

		public SessionProperties build() {
			return new SessionProperties(this.mediaMode, this.recordingMode, this.defaultRecordingLayout,
					this.defaultCustomLayout);
		}

		public SessionProperties.Builder mediaMode(MediaMode mediaMode) {
			this.mediaMode = mediaMode;
			return this;
		}

		public SessionProperties.Builder recordingMode(RecordingMode recordingMode) {
			this.recordingMode = recordingMode;
			return this;
		}

		public SessionProperties.Builder defaultRecordingLayout(RecordingLayout layout) {
			this.defaultRecordingLayout = layout;
			return this;
		}

		public SessionProperties.Builder defaultCustomLayout(String path) {
			this.defaultCustomLayout = path;
			return this;
		}

	}

	protected SessionProperties() {
		this.mediaMode = MediaMode.ROUTED;
		this.recordingMode = RecordingMode.MANUAL;
		this.defaultRecordingLayout = RecordingLayout.BEST_FIT;
		this.defaultCustomLayout = "";
	}

	private SessionProperties(MediaMode mediaMode, RecordingMode recordingMode, RecordingLayout layout,
			String defaultCustomLayout) {
		this.mediaMode = mediaMode;
		this.recordingMode = recordingMode;
		this.defaultRecordingLayout = layout;
		this.defaultCustomLayout = defaultCustomLayout;
	}

	public RecordingMode recordingMode() {
		return this.recordingMode;
	}

	public MediaMode mediaMode() {
		return this.mediaMode;
	}

	public RecordingLayout defaultRecordingLayout() {
		return this.defaultRecordingLayout;
	}

	public String defaultCustomLayout() {
		return this.defaultCustomLayout;
	}

}