import { Component, OnInit } from '@angular/core';
import { ParticipantService, SidenavMenuService } from 'openvidu-angular';

@Component({
	selector: 'app-layout-test',
	templateUrl: './layout-test.component.html',
	styleUrls: ['./layout-test.component.scss']
})
export class LayoutTestComponent implements OnInit {
	connectionIds: string[] = [];
	constructor(private menuService: SidenavMenuService, private participantService: ParticipantService) {}

	ngOnInit(): void {}

	addParticipant() {
		const id = `test${Math.random()}`;
		const event: any = { connection: { connectionId: id } };
		this.connectionIds.push(id);
		//TODO
		// this.remoteUserService.add(event, null);
	}

	deleteParticipant() {
		if (this.connectionIds.length > 0) {
			//TODO:
			// this.remoteUserService.removeUserByConnectionId(this.connectionIds.pop());
		}
	}

	toggleMenu() {
		// this.menuService.toggleMenu();
	}
}
