import { Component, Inject, NgZone, OnDestroy, ViewChild } from '@angular/core';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { take } from 'rxjs/operators';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-info-dialog',
  templateUrl: './info-dialog.component.html',
  styleUrls: ['./info-dialog.component.css'],
  standalone: false,
})
export class InfoDialogComponent implements OnDestroy {
  title: string;
  subtitle: string;
  updateFunction: () => Promise<string>;
  updateInterval: number;

  textAreaValue: string;

  interval;

  @ViewChild('autosize') autosize: CdkTextareaAutosize;

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: {
      title: string;
      subtitle: string;
      updateFunction: () => Promise<string>;
      updateInterval: number;
    },
    private _ngZone: NgZone
  ) {
    this.title = data.title;
    this.subtitle = data.subtitle;
    this.updateFunction = data.updateFunction;
    this.updateInterval = data.updateInterval;

    this.updateValue();

    if (this.updateInterval) {
      this.interval = setInterval(() => {
        this.updateValue();
      }, this.updateInterval);
    }

    // this.publisher
    //   .getSenders()
    //   .filter((sender) => {
    //     return sender.track?.kind === 'video';
    //   })[0]
    //   .getStats()
    //   .then((stats) => {
    //     stats.forEach((report) => {
    //       if (
    //         report.type === 'outbound-rtp' ||
    //         report.type === 'remote-inbound-rtp'
    //       ) {
    //         console.log(report.type);
    //         console.log(report);
    //         this.textAreaValue = report.framesPerSecond;
    //       }
    //     });
    //   });

    // this.publisher.getConnectedAddress().then((address) => {
    //   this.textAreaValue = address! + '\n';
    //   this.textAreaValue += this.publisher.getConnectionState() + '\n';
    //   this.textAreaValue += this.publisher.getICEConnectionState() + '\n';
    //   this.textAreaValue += this.publisher.getSignallingState() + '\n';
    //   this.textAreaValue += this.publisher.getLocalDescription()!.sdp + '\n';
    //   this.textAreaValue += this.publisher.getRemoteDescription()!.sdp + '\n';
    //   this.subscriber.getConnectedAddress().then((address) => {
    //     this.textAreaValue += address! + '\n';
    //     this.textAreaValue += this.subscriber.getConnectionState() + '\n';
    //     this.textAreaValue += this.subscriber.getICEConnectionState() + '\n';
    //     this.textAreaValue += this.subscriber.getSignallingState() + '\n';
    //     this.textAreaValue += this.subscriber.getLocalDescription()!.sdp + '\n';
    //     this.textAreaValue +=
    //       this.subscriber.getRemoteDescription()!.sdp + '\n';
    //   });
    // });
  }

  ngOnDestroy() {
    clearInterval(this.interval);
  }

  async updateValue() {
    this.textAreaValue = await this.updateFunction();
    this.triggerResize();
  }

  triggerResize() {
    // Wait for changes to be applied, then trigger textarea resize.
    this._ngZone.onStable
      .pipe(take(1))
      .subscribe(() => this.autosize.resizeToFitContent(true));
  }
}
