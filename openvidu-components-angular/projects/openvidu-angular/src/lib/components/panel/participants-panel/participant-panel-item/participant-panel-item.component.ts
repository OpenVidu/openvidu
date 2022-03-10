import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ContentChild, Input, OnDestroy, OnInit, TemplateRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { ParticipantPanelItemElementsDirective } from '../../../../directives/template/openvidu-angular.directive';
import { ParticipantAbstractModel } from '../../../../models/participant.model';
import { OpenViduAngularConfigService } from '../../../../services/config/openvidu-angular.config.service';

@Component({
	selector: 'ov-participant-panel-item',
	templateUrl: './participant-panel-item.component.html',
	styleUrls: ['./participant-panel-item.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ParticipantPanelItemComponent implements OnInit, OnDestroy {
	@ContentChild('participantPanelItemElements', { read: TemplateRef }) participantPanelItemElementsTemplate: TemplateRef<any>;
	showMuteButton: boolean = true;
	private muteButtonSub: Subscription;

	@ContentChild(ParticipantPanelItemElementsDirective)
	set externalItemElements(externalItemElements: ParticipantPanelItemElementsDirective) {
		// This directive will has value only when ITEM ELEMENTS component tagget with '*ovParticipantPanelItemElements' directive
		// is inside of the P PANEL ITEM component tagged with '*ovParticipantPanelItem' directive
		if (externalItemElements) {
			this.participantPanelItemElementsTemplate = externalItemElements.template;
		}
	}

	@Input()
	set participant(p: ParticipantAbstractModel) {
		this._participant = p;
	}

	_participant: ParticipantAbstractModel;
	constructor(private libService: OpenViduAngularConfigService, private cd: ChangeDetectorRef) {}

	ngOnInit(): void {
		this.subscribeToParticipantPanelItemDirectives();
	}
	ngOnDestroy(): void {
		if (this.muteButtonSub) this.muteButtonSub.unsubscribe();
	}

	toggleMuteForcibly() {
		this._participant.setMutedForcibly(!this._participant.isMutedForcibly);
	}

	private subscribeToParticipantPanelItemDirectives() {
		this.muteButtonSub = this.libService.participantItemMuteButton.subscribe((value: boolean) => {
			console.warn("show mute", value);

			this.showMuteButton = value;
			this.cd.markForCheck();
		});
	}
}
