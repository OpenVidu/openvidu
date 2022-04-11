/*
 * (C) Copyright 2017-2022 OpenVidu (https://openvidu.io)
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

import { VirtualBackgroundImageOptions } from './VirtualBackgroundImageOptions';

/**
 * Options to apply to a Virtual Background Image filter. See [[Stream.applyFilter]]
 */
export interface VirtualBackgroundChromaOptions extends VirtualBackgroundImageOptions {
    /**
     * H component (Hue) range for the HSV chroma color. A pixel color must be inside this range to be replaced by the chroma filter
     */
    chromaHRange: [number, number];
    /**
     * S component (Saturation) range for the HSV chroma color. A pixel color must be inside this range to be replaced by the chroma filter
     */
    chromaSRange: [number, number];
    /**
     * V component (Value) range for the HSV chroma color. A pixel color must be inside this range to be replaced by the chroma filter
     */
    chromaVRange: [number, number];
    /**
     * Whether to automatically detect the most probable chroma color or not
     */
    chromaAuto: boolean;
}
