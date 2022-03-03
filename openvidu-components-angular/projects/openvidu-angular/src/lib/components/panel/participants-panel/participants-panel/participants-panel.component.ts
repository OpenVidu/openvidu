import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ContentChild, OnDestroy, OnInit, TemplateRef } from '@angular/core';
import { ParticipantAbstractModel } from '../../../../models/participant.model';
import { ParticipantService } from '../../../../services/participant/participant.service';
import { SidenavMenuService } from '../../../..//services/sidenav-menu/sidenav-menu.service';
import { ParticipantPanelItemDirective } from '../../../../directives/openvidu-angular.directive';
import { Subscription } from 'rxjs';

@Component({
	selector: 'ov-participants-panel',
	templateUrl: './participants-panel.component.html',
	styleUrls: ['./participants-panel.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ParticipantsPanelComponent implements OnInit, OnDestroy {
	localParticipant: any;
	remoteParticipants: ParticipantAbstractModel[] = [];

	private localParticipantSubs: Subscription;
	private remoteParticipantsSubs: Subscription;
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
	) {

	}

	ngOnInit(): void {

		this.localParticipantSubs = this.participantService.localParticipantObs.subscribe((p: ParticipantAbstractModel) => {
			this.localParticipant = p;
			// Mark for re-rendering using an impure pipe 'streamsTypesEnabled'
			this.cd.markForCheck();
		});

		this.remoteParticipantsSubs = this.participantService.remoteParticipantsObs.subscribe((p: ParticipantAbstractModel[]) => {
			// Workaround which forc the objects references update
			// After one entirely day trying to make it works, this is the only way
			p.forEach((par, index) => {
				this.remoteParticipants[index] = Object.create(par);
			});
			// Mark for re-rendering using an impure pipe 'streamsTypesEnabled'
			this.cd.markForCheck();
		});
	}

	ngOnDestroy() {
		if (this.localParticipantSubs) this.localParticipantSubs.unsubscribe();
		if (this.remoteParticipantsSubs) this.remoteParticipantsSubs.unsubscribe;
	}

	close() {
		this.menuService.closeMenu();
	}
}
