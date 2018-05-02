"use strict";
/*
 * (C) Copyright 2018 OpenVidu (http://openvidu.io/)
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
exports.__esModule = true;
/**
 * How the video will be inserted in the DOM for Publishers and Subscribers. See [[PublisherProperties.insertMode]] and [[SubscriberProperties.insertMode]]
 */
var VideoInsertMode;
(function (VideoInsertMode) {
    /**
     * Video inserted after the target element (as next sibling)
     */
    VideoInsertMode["AFTER"] = "AFTER";
    /**
     * Video inserted as last child of the target element
     */
    VideoInsertMode["APPEND"] = "APPEND";
    /**
     * Video inserted before the target element (as previous sibling)
     */
    VideoInsertMode["BEFORE"] = "BEFORE";
    /**
     * Video inserted as first child of the target element
     */
    VideoInsertMode["PREPEND"] = "PREPEND";
    /**
     * Video replaces target element
     */
    VideoInsertMode["REPLACE"] = "REPLACE";
})(VideoInsertMode = exports.VideoInsertMode || (exports.VideoInsertMode = {}));
//# sourceMappingURL=VideoInsertMode.js.map