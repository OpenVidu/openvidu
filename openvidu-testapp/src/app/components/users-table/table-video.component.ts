import { Component, Input, AfterViewInit, EventEmitter, Output, DoCheck } from '@angular/core';
import { StreamManager } from 'openvidu-browser';

@Component({
    selector: 'app-table-video',
    template: `
        <div class="icon-div">
            <mat-spinner [color]="'warn'"
                *ngIf="!success() && !fail()" [diameter]="24">
            </mat-spinner>
            <mat-icon [color]="'warn'" *ngIf="success() || fail()"
                matTooltip aria-label="Select report" (click)="emitClickIconEvent($event)">{{success() ? 'done' : 'warning'}}</mat-icon>
        </div>
        <app-ov-video [streamManager]="streamManager.streamManager"
            [attrstyle]="'width: 120px; height: initial'">
        </app-ov-video>
    `,
    styles: ['.icon-div {position: absolute; z-index: 999; left: calc(50% - 60px); padding: 2px 0 0 2px; cursor: pointer}']
})
export class TableVideoComponent implements AfterViewInit, DoCheck {

    @Input() streamManager: StreamManagerWrapper;
    @Output() readyForReport = new EventEmitter<StreamManagerWrapper>();
    @Output() clickIcon = new EventEmitter<any>();

    state = {};
    playingTimeout;

    constructor() { }

    ngAfterViewInit() {
        this.playingTimeout = setTimeout(() => {
            if (!this.state['playing']) {
                this.state['timeoutPlaying'] = Date.now() - this.streamManager.startTime;
                this.readyForReport.emit({
                    startTime: this.streamManager.startTime,
                    connectionId: this.streamManager.connectionId,
                    state: this.state,
                    streamManager: this.streamManager.streamManager
                });
            }
        }, 10000);
    }

    ngDoCheck() {
        if ((Object.keys(this.state).length !== Object.keys(this.streamManager.state).length) &&
            (!this.state['timeoutPlaying'])) {
            this.state = Object.assign({}, this.streamManager.state);
            if (this.success() || this.fail()) {
                clearTimeout(this.playingTimeout);
                this.readyForReport.emit({
                    startTime: this.streamManager.startTime,
                    connectionId: this.streamManager.connectionId,
                    state: this.state,
                    streamManager: this.streamManager.streamManager
                });
            }
        }
    }

    success(): boolean {
        return (!!this.state['connected'] &&
            !!this.state['playing']);
    }

    fail(): boolean {
        return (!!this.state['errorConnecting'] ||
            !!this.state['timeoutPlaying']);
    }

    emitClickIconEvent(event) {
        event.stopPropagation();
        this.clickIcon.emit({
            in: this.streamManager.streamManager.remote,
            connectionId: this.streamManager.connectionId,
            streamId: this.streamManager.streamManager.stream.streamId
        });
    }

}

export interface StreamManagerWrapper {
    startTime: number;
    connectionId: string;
    streamManager: StreamManager;
    state: any;
}
