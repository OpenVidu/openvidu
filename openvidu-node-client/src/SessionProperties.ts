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

import { MediaMode } from './MediaMode';
import { RecordingLayout } from './RecordingLayout';
import { RecordingMode } from './RecordingMode';

export interface SessionProperties {

	mediaMode?: MediaMode;
	recordingMode?: RecordingMode;

	/**
	 * Default value used to initialize property [[RecordingProperties.recordingLayout]] of every recording of this session.
	 * You can easily override this value later by setting [[RecordingProperties.recordingLayout]] to any other value
	 */
	defaultRecordingLayout?: RecordingLayout;

	/**
	 * Default value used to initialize property [[RecordingProperties.customLayout]] of every recording of this session.
	 * You can easily override this value later by setting [[RecordingProperties.customLayout]] to any other value
	 */
	defaultCustomLayout?: string;
}
