import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ContentChild, OnInit, TemplateRef } from '@angular/core';
import { ParticipantAbstractModel, ParticipantModel } from '../../../../models/participant.model';
import { ParticipantService } from '../../../../services/participant/participant.service';
import { SidenavMenuService } from '../../../..//services/sidenav-menu/sidenav-menu.service';
import { ParticipantPanelItemDirective } from '../../../../directives/openvidu-angular.directive';

@Component({
	selector: 'ov-participants-panel',
	templateUrl: './participants-panel.component.html',
	styleUrls: ['./participants-panel.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ParticipantsPanelComponent implements OnInit {
	localParticipant: any;
	remoteParticipants: ParticipantAbstractModel[] = [];
	@ContentChild('participantPanelItem', { read: TemplateRef }) participantPanelItemTemplate: TemplateRef<any>;

	@ContentChild(ParticipantPanelItemDirective)
	set externalParticipantPanelItem(externalParticipantPanelItem: ParticipantPanelItemDirective) {
		// This directive will has value only when PARTICIPANT PANEL ITEM component tagged with '*ovParticipantPanelItem'
		// is inside of the PARTICIPANTS PANEL component tagged with '*ovParticipantsPanel'
		if (externalParticipantPanelItem) {
			this.participantPanelItemTemplate = externalParticipantPanelItem.template;
		}
	}

	constructor(
		protected participantService: ParticipantService,
		protected menuService: SidenavMenuService,
		private cd: ChangeDetectorRef
	) {}

	ngOnInit(): void {
		this.participantService.localParticipantObs.subscribe((p: ParticipantModel) => {
			this.localParticipant = p;
			// Mark for re-rendering using an impure pipe 'streamsTypesEnabled'
			this.cd.markForCheck();
		});

		this.participantService.remoteParticipantsObs.subscribe((p: ParticipantModel[]) => {
			this.remoteParticipants = p;
			// Mark for re-rendering using an impure pipe 'streamsTypesEnabled'
			this.cd.markForCheck();
		});
	}

	close() {
		this.menuService.closeMenu();
	}
}
