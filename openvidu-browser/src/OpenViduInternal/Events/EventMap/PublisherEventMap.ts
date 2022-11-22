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

import { StreamEvent } from '../StreamEvent';
import { StreamManagerEventMap } from './StreamManagerEventMap';

/**
 * Events dispatched by {@link Publisher} object. Manage event listeners with
 * {@link Publisher.on}, {@link Publisher.once} and {@link Publisher.off} methods.
 *
 * Example:
 *
 * ```javascript
 * publisher.on('accessDenied', () => {
 *      console.error('Camera access has been denied!');
 * }
 *
 * publisher.off('accessDenied');
 * ```
 */
export interface PublisherEventMap extends StreamManagerEventMap {
    /**
     * Event dispatched when the {@link Publisher} has been published to the session (see {@link Session.publish}).
     */
    streamCreated: StreamEvent;

    /**
     * Event dispatched when the {@link Publisher} has been unpublished from the session.
     */
    streamDestroyed: StreamEvent;

    /**
     * Event dispatched when a Publisher tries to access some media input device and has the required permissions to do so.
     *
     * This happens when calling {@link OpenVidu.initPublisher} or {@link OpenVidu.initPublisherAsync} and the application
     * has permissions to use the devices. This usually means the user has accepted the permissions dialog that the
     * browser will show when trying to access the camera/microphone/screen.
     */
    accessAllowed: never;

    /**
     * Event dispatched when a Publisher tries to access some media input device and does NOT have the required permissions to do so.
     *
     * This happens when calling {@link OpenVidu.initPublisher} or {@link OpenVidu.initPublisherAsync} and the application
     * lacks the required permissions to use the devices. This usually means the user has NOT accepted the permissions dialog that the
     * browser will show when trying to access the camera/microphone/screen.
     */
    accessDenied: never;

    /**
     * Event dispatched when the pop-up shown by the browser to request permissions for the input media devices is opened.
     *
     * You can use this event to alert the user about granting permissions for your website. Note that this event is artificially
     * generated based only on time intervals when accessing media devices. A heavily overloaded client device that simply takes more
     * than usual to access the media device could produce a false trigger of this event.
     */
    accessDialogOpened: never;

    /**
     * Event dispatched after the user clicks on "Allow" or "Block" in the pop-up shown by the browser to request permissions
     * for the input media devices.
     *
     * This event can only be triggered after an {@link accessDialogOpened} event has been previously triggered.
     */
    accessDialogClosed: never;
}
