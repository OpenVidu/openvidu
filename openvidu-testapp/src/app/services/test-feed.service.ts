import { Injectable } from '@angular/core';
import { ParticipantEvent, RoomEvent, TrackEvent } from 'livekit-client';
import { Subject } from 'rxjs';

export interface TestAppEvent {
    eventType: RoomEvent | ParticipantEvent | TrackEvent;
    eventCategory: 'RoomEvent' | 'ParticipantEvent' | 'TrackEvent';
    eventContent: any;
    eventDescription: string;
}

@Injectable()
export class TestFeedService {

    newLastEvent$ = new Subject<any>();

    pushNewEvent(userAndEvent: { user: number, event: TestAppEvent }) {
        this.newLastEvent$.next(userAndEvent);
    }

}
