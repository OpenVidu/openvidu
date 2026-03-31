import { Component, inject } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';


@Component({
    selector: 'app-events-dialog',
    template: `
        <h2 mat-dialog-title>{{target}} events</h2>
        <mat-dialog-content>
          <mat-slide-toggle [(ngModel)]="checkAll" (change)="updateAll()" [color]="'warn'"><i>ALL</i></mat-slide-toggle>
          <mat-divider></mat-divider>
          <div class="row no-wrap-row">
            <div class="col-50">
              @for (event of eventArray | slice:0:(eventArray.length/2); track event) {
                <div class="toggle">
                  <mat-slide-toggle
                    (change)="toggleEvent($event)"
                    [checked]="eventCollection.get(event)"
                    [name]="event"
                    color="warn">{{event}}
                  </mat-slide-toggle>
                </div>
              }
            </div>
            <div class="col-50">
              @for (event of eventArray | slice:(eventArray.length/2 + 1):(eventArray.length); track event) {
                <div class="toggle">
                  <mat-slide-toggle
                    (change)="toggleEvent($event)"
                    [checked]="eventCollection.get(event)"
                    [name]="event"
                    color="warn">{{event}}
                  </mat-slide-toggle>
                </div>
              }
            </div>
          </div>
        </mat-dialog-content>
        <mat-dialog-actions>
          <button mat-button id="close-dialog-btn" mat-dialog-close="">CLOSE</button>
        </mat-dialog-actions>
        `,
    styles: [
        'mat-dialog-content { display: inline; }',
        'mat-divider { margin-top: 5px; margin-bottom: 5px; }',
        '.col-50 {flex-basis: 50%; box-sizing: border-box; padding-left: 20px; }',
        '.toggle { }'
    ],
    imports: [SlicePipe, FormsModule, MatDialogModule, MatSlideToggleModule, MatDividerModule, MatButtonModule],
})
export class EventsDialogComponent {

    target = '';
    checkAll = true;
    eventCollection: Map<string, boolean>;
    eventArray: string[];

    private dialogData = inject(MAT_DIALOG_DATA);

    constructor(public dialogRef: MatDialogRef<EventsDialogComponent>) {
        const data = this.dialogData;
        this.target = data.target;
        this.eventCollection = data.eventCollection;
        this.eventArray = Array.from(this.eventCollection.keys());
    }

    updateAll() {
        this.eventCollection.forEach((value: boolean, key: string) => {
            this.eventCollection.set(key, this.checkAll);
        });
    }

    toggleEvent(event: any) {
        this.eventCollection.set(event.source.name, event.checked);
    }

}
