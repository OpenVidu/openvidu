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

public class RecordingProperties {

	private String name;
	private RecordingLayout recordingLayout;
	private String customLayout;

	public static class Builder {

		private String name = "";
		private RecordingLayout recordingLayout;
		private String customLayout;

		public RecordingProperties build() {
			return new RecordingProperties(this.name, this.recordingLayout, this.customLayout);
		}

		public RecordingProperties.Builder name(String name) {
			this.name = name;
			return this;
		}

		public RecordingProperties.Builder recordingLayout(RecordingLayout layout) {
			this.recordingLayout = layout;
			return this;
		}

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

	public String name() {
		return this.name;
	}

	public RecordingLayout recordingLayout() {
		return this.recordingLayout;
	}

	public String customLayout() {
		return this.customLayout;
	}

}
