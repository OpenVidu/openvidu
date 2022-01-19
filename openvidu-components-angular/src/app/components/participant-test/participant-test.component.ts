import { Component, OnInit } from '@angular/core';
import { ParticipantModel } from 'openvidu-components-angular';

@Component({
  selector: 'app-participant-test',
  templateUrl: './participant-test.component.html',
  styleUrls: ['./participant-test.component.scss']
})
export class ParticipantTestComponent implements OnInit {

  participant: ParticipantModel;
  constructor() { }

  ngOnInit(): void {
    this.participant = new ParticipantModel();
  }

}
