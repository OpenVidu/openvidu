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

/**
 * Options to apply to a Virtual Background filter. See [[Stream.applyFilter]]
 */
export interface VirtualBackgroundOptions {
    /**
     * Radius of the effect. Higher values mean less defined edges but a smoother transition between the person's mask and
     * the background. Number between [0, 1] with 2 decimals
     */
    maskRadius?: number;

    /**
     * Amplitude of the space between the person's mask and the background. Higher values mean the effect will be applied
     * more tightly to the person's mask, but this may cause loss of pixel information of the person. Lower values mean the
     * effect will be applied further from the person's mask, granting a full view of the person but at the cost of the accuracy
     * of the person's mask. Number between [0, 1] with 2 decimals
     */
    backgroundCoverage?: number;

    /**
     * Blends the background with the person's mask with a light effect. Higher values mean a more aggressive light blending
     * Number between [0, 1] with 2 decimals
     */
    lightWrapping?: number;
}
