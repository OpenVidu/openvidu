import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { Stream, Session } from 'openvidu-browser';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

@Component({
    selector: 'stream',
    styles: [`    
        .participant {
	        margin: 10px;
        }
        .participant video {
            
        }`],
    template: `
        <div class='participant'>
          <p>{{stream.getId()}}</p>
          <video *ngIf="!stream.local" autoplay="true" [src]="videoSrc"></video>
          <video *ngIf="stream.local" autoplay="true" [src]="videoSrc" muted></video>
        </div>`
})
export class StreamComponent {

    @Input()
    stream: Stream;

    videoSrc: SafeUrl;

    constructor(private sanitizer: DomSanitizer) { }

    ngOnInit() {

        let int = setInterval(() => {
            if (this.stream.getWrStream()) {
                this.videoSrc = this.sanitizer.bypassSecurityTrustUrl(
                    URL.createObjectURL(this.stream.getWrStream()));
                console.log("Video tag src=" + this.videoSrc);
                clearInterval(int);
            }
        }, 1000);

        //this.stream.addEventListener('src-added', () => {
        //    this.video.src = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(this.stream.getWrStream())).toString();
        //});
    }

}