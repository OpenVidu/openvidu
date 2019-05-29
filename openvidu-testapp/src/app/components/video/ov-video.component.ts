import { Component, Input, ViewChild, ElementRef, OnInit, AfterViewInit } from '@angular/core';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';
import { StreamManager } from 'openvidu-browser';

@Component({
    selector: 'app-ov-video',
    template: '<video #videoElement [poster]="poster" [attr.style]="sanitizedStyle"></video>'
})
export class OpenViduVideoComponent implements OnInit, AfterViewInit {

    @ViewChild('videoElement', { static: false }) elementRef: ElementRef;

    @Input() poster = '';
    @Input() attrstyle = '';

    sanitizedStyle: SafeStyle;

    _streamManager: StreamManager;

    constructor(private sanitizer: DomSanitizer) { }

    ngOnInit() {
        this.sanitizedStyle = this.sanitizer.bypassSecurityTrustStyle(this.attrstyle);
    }

    ngAfterViewInit() {
        this._streamManager.addVideoElement(this.elementRef.nativeElement);
    }

    @Input()
    set streamManager(streamManager: StreamManager) {
        this._streamManager = streamManager;
        if (!!this.elementRef) {
            this._streamManager.addVideoElement(this.elementRef.nativeElement);
        }
    }

}
