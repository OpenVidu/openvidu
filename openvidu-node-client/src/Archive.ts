export class Archive {

    private id: string;
    private name: string;
    private sessionId: string;
    private createdAt: number;
    private size: number = 0;
    private duration: number = 0;
    private url: string;
    private hasaudio: boolean = true;
    private hasvideo: boolean = true;
    private status: Archive.Status;

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

    public getStatus(): Archive.Status {
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

export namespace Archive {
    export enum Status {
        starting,   // The recording is starting (cannot be stopped)
        started,    // The recording has started and is going on
        stopped,    // The recording has finished OK
        available,  // The recording is available for downloading. This status is reached for all
        // stopped recordings if property 'openvidu.recording.free-access' is true
        failed      // The recording has failed
    }
}