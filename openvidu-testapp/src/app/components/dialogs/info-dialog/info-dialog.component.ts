import { Component, NgZone, OnDestroy, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { take } from 'rxjs/operators';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-info-dialog',
  templateUrl: './info-dialog.component.html',
  styleUrl: './info-dialog.component.css',
  imports: [FormsModule, CdkTextareaAutosize, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
})
export class InfoDialogComponent implements OnDestroy {
  title: string;
  subtitle: string;
  updateFunction: () => Promise<string>;
  updateInterval: number;

  textAreaValue: string;

  interval;

  @ViewChild('autosize') autosize: CdkTextareaAutosize;

  private data = inject<{
    title: string;
    subtitle: string;
    updateFunction: () => Promise<string>;
    updateInterval: number;
  }>(MAT_DIALOG_DATA);

  constructor(
    private _ngZone: NgZone
  ) {
    const data = this.data;
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
