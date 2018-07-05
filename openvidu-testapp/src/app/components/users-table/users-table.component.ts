import { Component, Input, EventEmitter, Output } from '@angular/core';
import { StreamManager } from 'openvidu-browser';
import { StreamManagerWrapper } from './table-video.component';

@Component({
    selector: 'app-users-table',
    styleUrls: ['users-table.component.css'],
    templateUrl: 'users-table.component.html',
})
export class UsersTableComponent {

    @Input() numberOfStreams = { out: 0, in: 0 };
    @Input() connections: string[] = [];
    @Input() publishers: StreamManagerWrapper[] = [];
    @Input() subscribers: { connectionId: string, subs: StreamManagerWrapper[] }[] = [];

    @Output() reportForStream = new EventEmitter<StreamManagerWrapper>(true);
    @Output() focusReport = new EventEmitter<any>();

    getSubscriber(connectionId: string, publisher: StreamManager): StreamManagerWrapper {
        const subscribersForConnection = this.subscribers.find(s => s.connectionId === connectionId);
        if (!!subscribersForConnection && !!subscribersForConnection.subs) {
            return subscribersForConnection.subs.find(sub => {
                return (sub.streamManager.stream.connection.connectionId === publisher.stream.connection.connectionId);
            });
        }
    }

    emitReadyForReport(event: StreamManagerWrapper) {
        this.reportForStream.emit(event);
    }

    emitFocusOnReport(event) {
        this.focusReport.emit(event);
    }

}
