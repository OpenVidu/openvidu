import { Component, OnInit } from '@angular/core';
import { ParticipantModel } from 'openvidu-angular';

@Component({
  selector: 'app-stream-test',
  templateUrl: './stream-test.component.html',
  styleUrls: ['./stream-test.component.scss']
})
export class StreamTestComponent implements OnInit {

  participant: ParticipantModel;
  constructor() { }

  ngOnInit(): void {
    this.participant = new ParticipantModel();
  }

}
