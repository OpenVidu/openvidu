import { Component, Input, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Subscriber } from 'openvidu-browser';

@Component({
    selector: 'app-ov-video',
    template: '<video #videoElement></video>'
})
export class OpenViduVideoComponent implements AfterViewInit {

    @ViewChild('videoElement') elementRef: ElementRef;

    _subscriber: Subscriber;

    ngAfterViewInit() {
        this._subscriber.addVideoElement(this.elementRef.nativeElement);
    }

    @Input()
    set subscriber(subscriber: Subscriber) {
        this._subscriber = subscriber;
        if (!!this.elementRef) {
            this._subscriber.addVideoElement(this.elementRef.nativeElement);
        }
    }

}
