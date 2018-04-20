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

import { MediaMode } from "./MediaMode";
import { RecordingMode } from "./RecordingMode";
import { RecordingLayout } from "./RecordingLayout";

export class SessionProperties {

	constructor(private mediaModeProp: MediaMode, private recordingModeProp: RecordingMode, private defaultRecordingLayoutProp: RecordingLayout) { }

	mediaMode(): string {
		return this.mediaModeProp;
	}

	recordingMode(): RecordingMode {
		return this.recordingModeProp;
	}

	defaultRecordingLayout(): RecordingLayout {
		return this.defaultRecordingLayoutProp;
	}
}

export namespace SessionProperties {
	export class Builder {

		private mediaModeProp: MediaMode = MediaMode.ROUTED;
		private recordingModeProp: RecordingMode = RecordingMode.MANUAL;
		private defaultRecordingLayoutProp: RecordingLayout = RecordingLayout.BEST_FIT;

		build(): SessionProperties {
			return new SessionProperties(this.mediaModeProp, this.recordingModeProp, this.defaultRecordingLayoutProp);
		}

		mediaMode(mediaMode: MediaMode): Builder {
			this.mediaModeProp = mediaMode;
			return this;
		}

		recordingMode(recordingMode: RecordingMode): Builder {
			this.recordingModeProp = recordingMode;
			return this;
		}

		defaultRecordingLayout(layout: RecordingLayout): Builder {
			this.defaultRecordingLayoutProp = layout;
			return this;
		}
	};
}
