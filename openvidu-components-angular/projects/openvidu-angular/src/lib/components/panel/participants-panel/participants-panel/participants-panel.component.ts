import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ContentChild, OnDestroy, OnInit, TemplateRef } from '@angular/core';
import { ParticipantAbstractModel } from '../../../../models/participant.model';
import { ParticipantService } from '../../../../services/participant/participant.service';
import { SidenavMenuService } from '../../../..//services/sidenav-menu/sidenav-menu.service';
import { ParticipantPanelItemDirective } from '../../../../directives/template/openvidu-angular.directive';
import { Subscription } from 'rxjs';

/**
 *
 * The **ParticipantsPanelComponent** is hosted inside of the {@link PanelComponent}.
 * It is in charge of displaying the participants connected to the session.
 * This component is composed by the {@link ParticipantPanelItemComponent}.
 *
 * <div class="custom-table-container">
 * <div>
 *
 * <h3>OpenVidu Angular Directives</h3>
 *
 * The ParticipantsPanelComponent can be replaced with a custom component. It provides us the following {@link https://angular.io/guide/structural-directives Angular structural directives}
 * for doing this.
 *
 * |            **Directive**           |                 **Reference**                 |
 * |:----------------------------------:|:---------------------------------------------:|
 * |       ***ovParticipantsPanel**      |       {@link ParticipantsPanelDirective}      |
 *
 * </br>
 *
 * As the ParticipantsPanelComponent is composed by ParticipantPanelItemComponent, it is also providing us a way to **replace the participant item** with a custom one.
 * It will recognise the following directive in a child element.
 *
 * |            **Directive**           |                 **Reference**                 |
 * |:----------------------------------:|:---------------------------------------------:|
 * |     ***ovParticipantPanelItem**     |     {@link ParticipantPanelItemDirective}     |
 *
 * <p class="component-link-text">
 * 	<span class="italic">See all {@link OpenViduAngularDirectiveModule OpenVidu Angular Directives}</span>
 * </p>
 * </div>
 * </div>
 */
@Component({
	selector: 'ov-participants-panel',
	templateUrl: './participants-panel.component.html',
	styleUrls: ['./participants-panel.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ParticipantsPanelComponent implements OnInit, OnDestroy {
	localParticipant: any;
	remoteParticipants: ParticipantAbstractModel[] = [];

	/**
	 * @ignore
	 */
	@ContentChild('participantPanelItem', { read: TemplateRef }) participantPanelItemTemplate: TemplateRef<any>;

	@ContentChild(ParticipantPanelItemDirective)
	set externalParticipantPanelItem(externalParticipantPanelItem: ParticipantPanelItemDirective) {
		// This directive will has value only when PARTICIPANT PANEL ITEM component tagged with '*ovParticipantPanelItem'
		// is inside of the PARTICIPANTS PANEL component tagged with '*ovParticipantsPanel'
		if (externalParticipantPanelItem) {
			this.participantPanelItemTemplate = externalParticipantPanelItem.template;
		}
	}

	private localParticipantSubs: Subscription;
	private remoteParticipantsSubs: Subscription;

	/**
	 * @ignore
	 */
	constructor(
		protected participantService: ParticipantService,
		protected menuService: SidenavMenuService,
		private cd: ChangeDetectorRef
	) {}

	ngOnInit(): void {
		this.localParticipantSubs = this.participantService.localParticipantObs.subscribe((p: ParticipantAbstractModel) => {
			this.localParticipant = p;
			// Mark for re-rendering using an impure pipe 'streamsTypesEnabled'
			this.cd.markForCheck();
		});

		this.remoteParticipantsSubs = this.participantService.remoteParticipantsObs.subscribe((p: ParticipantAbstractModel[]) => {
			// Workaround which forc the objects references update
			// After one entirely day trying to make it works, this is the only way
			const remoteParticipantsAux = [];
			p.forEach((par) => {
				remoteParticipantsAux.push(Object.create(par));
			});
			this.remoteParticipants = remoteParticipantsAux;
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
