import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { RoomOptions } from 'livekit-client';

@Component({
  selector: 'app-room-options-dialog',
  templateUrl: './room-options-dialog.component.html',
  styleUrls: ['./room-options-dialog.component.css']
})
export class RoomOptionsDialogComponent {

  roomOptions: RoomOptions;

  constructor(public dialogRef: MatDialogRef<RoomOptionsDialogComponent>, @Inject(MAT_DIALOG_DATA) public data: any) {
    this.roomOptions = data.roomOptions;
  }

}
