import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ParticipantAbstractModel, ParticipantModel } from '../../../../models/participant.model';
import { ParticipantService } from '../../../../services/participant/participant.service';
import { SidenavMenuService } from '../../../..//services/sidenav-menu/sidenav-menu.service';

@Component({
	selector: 'ov-participants-panel',
	templateUrl: './participants-panel.component.html',
	styleUrls: ['./participants-panel.component.css']
})
export class ParticipantsPanelComponent implements OnInit {
	localParticipant: any;
	remoteParticipants: ParticipantAbstractModel[] = [];

	constructor(protected participantService: ParticipantService, protected menuService: SidenavMenuService, private cd: ChangeDetectorRef) {}

	ngOnInit(): void {
		this.participantService.localParticipantObs.subscribe((p: ParticipantModel) => {
			this.localParticipant = p;
			// Mark for re-rendering using an impure pipe 'connectionsEnabled'
			this.cd.markForCheck();
		});

		this.participantService.remoteParticipantsObs.subscribe((p: ParticipantModel[]) => {
			this.remoteParticipants = p;
			// Mark for re-rendering using an impure pipe 'connectionsEnabled'
			this.cd.markForCheck();
		});
	}

	close() {
		this.menuService.closeMenu();
	}
}
