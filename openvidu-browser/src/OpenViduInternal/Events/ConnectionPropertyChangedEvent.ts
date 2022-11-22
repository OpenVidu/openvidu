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

import { Connection } from '../../OpenVidu/Connection';
import { Session } from '../../OpenVidu/Session';
import { Event } from './Event';

/**
 * **This feature is part of OpenVidu
 * <a href="https://docs.openvidu.io/en/stable/openvidu-pro/" style="display: inline-block; background-color: rgb(0, 136, 170); color: white; font-weight: bold; padding: 0px 5px; margin: 0 2px 0 2px; border-radius: 3px; font-size: 13px; line-height:21px; text-decoration: none; font-family: Montserrat, sans-serif">PRO</a>
 * and
 * <a href="https://docs.openvidu.io/en/stable/openvidu-enterprise/" style="display: inline-block; background-color: rgb(156, 39, 176); color: white; font-weight: bold; padding: 0px 5px; margin: 0 2px 0 2px; border-radius: 3px; font-size: 13px; line-height:21px; text-decoration: none; font-family: Montserrat, sans-serif">ENTERPRISE</a>
 * editions**
 *
 * Triggered by {@link SessionEventMap.connectionPropertyChanged}
 */
export class ConnectionPropertyChangedEvent extends Event {
    /**
     * The Connection whose property has changed
     */
    connection: Connection;

    /**
     * The property of the stream that changed. This value is either `"role"` or `"record"`
     */
    changedProperty: string;

    /**
     * New value of the property (after change, current value)
     */
    newValue: Object;

    /**
     * Previous value of the property (before change)
     */
    oldValue: Object;

    /**
     * @hidden
     */
    constructor(target: Session, connection: Connection, changedProperty: string, newValue: Object, oldValue: Object) {
        super(false, target, 'connectionPropertyChanged');
        this.connection = connection;
        this.changedProperty = changedProperty;
        this.newValue = newValue;
        this.oldValue = oldValue;
    }

    /**
     * @hidden
     */
    // tslint:disable-next-line:no-empty
    callDefaultBehavior() {}
}
