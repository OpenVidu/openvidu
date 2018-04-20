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

import { RecordingLayout } from "./RecordingLayout";

export class RecordingProperties {

    constructor(private rName: string, private recordingLayoutProp: RecordingLayout, private customLayoutProp: string) { }

    name(): string {
        return this.rName;
    }

    recordingLayout(): RecordingLayout {
        return this.recordingLayoutProp;
    }

    customLayout(): string {
        return this.customLayoutProp;
    }

}

export namespace RecordingProperties {
    export class Builder {

        private rName: string = '';
        private recordingLayoutProp: RecordingLayout;
        private customLayoutProp: string;

        build(): RecordingProperties {
            return new RecordingProperties(this.rName, this.recordingLayoutProp, this.customLayoutProp);
        }

        name(name: string): Builder {
            this.rName = name;
            return this;
        }

        recordingLayout(layout: RecordingLayout): Builder {
            this.recordingLayoutProp = layout;
            return this;
        }

        customLayout(path: string): Builder {
            this.customLayoutProp = path;
            return this;
        }
    };
}