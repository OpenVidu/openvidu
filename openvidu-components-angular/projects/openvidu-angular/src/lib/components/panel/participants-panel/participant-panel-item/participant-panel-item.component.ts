import { ChangeDetectionStrategy, Component, ContentChild, Input, TemplateRef } from '@angular/core';
import { ParticipantPanelItemElementsDirective } from '../../../../directives/template/openvidu-angular.directive';
import { ParticipantAbstractModel } from '../../../../models/participant.model';

@Component({
	selector: 'ov-participant-panel-item',
	templateUrl: './participant-panel-item.component.html',
	styleUrls: ['./participant-panel-item.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ParticipantPanelItemComponent {
	@ContentChild('participantPanelItemElements', { read: TemplateRef }) participantPanelItemElementsTemplate: TemplateRef<any>;
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
	constructor() {}

	toggleMuteForcibly() {
		this._participant.setMutedForcibly(!this._participant.isMutedForcibly);
	}
}
