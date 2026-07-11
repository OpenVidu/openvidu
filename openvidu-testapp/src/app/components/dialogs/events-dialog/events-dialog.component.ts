import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';

export interface ExtraToggle {
    label: string;
    checked: boolean;
}

export interface EventGroup {
    label: string;
    eventCollection: Map<string, boolean>;
    eventArray: string[];
    checkAll: boolean;
    extraToggles?: ExtraToggle[];
}

@Component({
    selector: 'app-events-dialog',
    template: `
        <h2 mat-dialog-title>{{target}} events</h2>
        <mat-dialog-content>
          @for (group of eventGroups; track group.label) {
            <h3 class="group-label">{{group.label}}</h3>
            <mat-slide-toggle [(ngModel)]="group.checkAll" (change)="updateAll(group)" [color]="'warn'"><i>ALL</i></mat-slide-toggle>
            <mat-divider></mat-divider>
            <div class="row no-wrap-row">
              <div class="col-50">
                @for (event of group.eventArray | slice:0:Math.ceil(group.eventArray.length/2); track event) {
                  <div class="toggle">
                    <mat-slide-toggle
                      (change)="toggleEvent($event, group)"
                      [checked]="group.eventCollection.get(event)"
                      [name]="event"
                      color="warn">{{event}}
                    </mat-slide-toggle>
                  </div>
                }
              </div>
              <div class="col-50">
                @for (event of group.eventArray | slice:Math.ceil(group.eventArray.length/2):group.eventArray.length; track event) {
                  <div class="toggle">
                    <mat-slide-toggle
                      (change)="toggleEvent($event, group)"
                      [checked]="group.eventCollection.get(event)"
                      [name]="event"
                      color="warn">{{event}}
                    </mat-slide-toggle>
                  </div>
                }
              </div>
            </div>
            @if (group.extraToggles && group.extraToggles.length > 0) {
              <mat-divider></mat-divider>
              @for (extraToggle of group.extraToggles; track extraToggle.label) {
                <div class="toggle extra-toggle">
                  <mat-slide-toggle
                    [(ngModel)]="extraToggle.checked"
                    [name]="extraToggle.label"
                    color="warn">{{extraToggle.label}}
                  </mat-slide-toggle>
                </div>
              }
            }
          }
        </mat-dialog-content>
        <mat-dialog-actions>
          <button mat-button id="close-dialog-btn" mat-dialog-close="">CLOSE</button>
        </mat-dialog-actions>
        `,
    styles: [
        'mat-dialog-content { display: inline; }',
        'mat-divider { margin-top: 5px; margin-bottom: 5px; }',
        '.col-50 {flex-basis: 50%; box-sizing: border-box; padding-left: 20px; }',
        '.toggle { }',
        '.group-label { margin-top: 15px; margin-bottom: 5px; }',
        '.group-label:first-child { margin-top: 0; }',
        '.extra-toggle { margin-top: 5px; }'
    ],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [SlicePipe, FormsModule, MatDialogModule, MatSlideToggleModule, MatDividerModule, MatButtonModule],
})
export class EventsDialogComponent {

    Math = Math;
    target = '';
    eventGroups: EventGroup[] = [];

    private dialogData = inject(MAT_DIALOG_DATA);

    constructor(public dialogRef: MatDialogRef<EventsDialogComponent>) {
        const data = this.dialogData;
        this.target = data.target;
        if (data.eventGroups) {
            this.eventGroups = data.eventGroups.map((g: { label: string; eventCollection: Map<string, boolean>; extraToggles?: ExtraToggle[] }) => ({
                label: g.label,
                eventCollection: g.eventCollection,
                eventArray: Array.from(g.eventCollection.keys()),
                checkAll: Array.from(g.eventCollection.values()).every(v => v),
                extraToggles: g.extraToggles,
            }));
        } else {
            // Backward compatibility: single eventCollection
            const eventCollection = data.eventCollection;
            this.eventGroups = [{
                label: data.target,
                eventCollection,
                eventArray: Array.from(eventCollection.keys()),
                checkAll: Array.from(eventCollection.values()).every(v => v),
            }];
        }
    }

    updateAll(group: EventGroup) {
        group.eventCollection.forEach((_value: boolean, key: string) => {
            group.eventCollection.set(key, group.checkAll);
        });
    }

    toggleEvent(event: any, group: EventGroup) {
        group.eventCollection.set(event.source.name, event.checked);
    }

}
