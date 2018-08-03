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

/**
 * **WARNING**: experimental option. This interface may change in the near future. See [[Stream.filter]]
 */
export interface Filter {

    /**
     * Type of filter applied. This is the name of the remote class identifying the filter to apply in Kurento Media Server.
     * For example: `"FaceOverlayFilter"`, `"GStreamerFilter"`.
     *
     * You can get this property in `*.kmd.json` files defining the Kurento filters: for GStreamerFilter that's
     * [here](https://github.com/Kurento/kms-filters/blob/53a452fac71d61795952e3d2202156c6b00f6d65/src/server/interface/filters.GStreamerFilter.kmd.json#L4)
     */
    type?: string;

    /**
     * Parameters used to initialized the filter.
     * These correspond to the constructor parameters used in the filter in Kurento Media Server (except for `mediaPipeline` parameter, which is never needed).
     *
     * For example: for `filter.type = "GStreamerFilter"` could be `filter.options = {"command": "videobalance saturation=0.0"}`
     *
     * You can get this property in `*.kmd.json` files defining the Kurento filters: for GStreamerFilter that's
     * [here](https://github.com/Kurento/kms-filters/blob/53a452fac71d61795952e3d2202156c6b00f6d65/src/server/interface/filters.GStreamerFilter.kmd.json#L13-L31)
     */
    options?: Object;

    /**
     * Value passed the last time [[Session.execFilterMethod]] or [[Session.forceExecFilterMethod]] were called
     * for the Stream owning this filter. If `undefined` those methods have not been called yet.
     *
     * You can use this value to know the current status of any applied filter
     */
    lastExecMethod?: {
        method: string,
        params: Object
    };

}