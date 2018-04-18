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

export class Recording {

    private id: string;
    private name: string;
    private sessionId: string;
    private createdAt: number;
    private size: number = 0;
    private duration: number = 0;
    private url: string;
    private hasaudio: boolean = true;
    private hasvideo: boolean = true;
    private status: Recording.Status;

    constructor(json: JSON) {
        this.id = json['id'];
        this.name = json['name'];
        this.sessionId = json['sessionId'];
        this.createdAt = json['createdAt'];
        this.size = json['size'];
        this.duration = json['duration'];
        this.url = json['url'];
        this.hasaudio = json['hasAudio'];
        this.hasvideo = json['hasVideo'];
        this.status = json['status'];
    }

    public getStatus(): Recording.Status {
        return this.status;
    }

    public getId(): string {
        return this.id;
    }

    public getName(): string {
        return this.name;
    }

    public getSessionId(): string {
        return this.sessionId;
    }

    public getCreatedAt(): number {
        return this.createdAt;
    }

    public getSize(): number {
        return this.size;
    }

    public getDuration(): number {
        return this.duration;
    }

    public getUrl(): string {
        return this.url;
    }

    public hasAudio(): boolean {
        return this.hasaudio;
    }

    public hasVideo(): boolean {
        return this.hasvideo;
    }
}

export namespace Recording {
    export enum Status {
        starting,   // The recording is starting (cannot be stopped)
        started,    // The recording has started and is going on
        stopped,    // The recording has finished OK
        available,  // The recording is available for downloading. This status is reached for all
        // stopped recordings if property 'openvidu.recording.free-access' is true
        failed      // The recording has failed
    }
}