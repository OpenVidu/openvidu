import { Directive, AfterViewInit, OnDestroy, Input, ElementRef } from '@angular/core';
import { OpenViduAngularConfigService } from '../../services/config/openvidu-angular.config.service';

@Directive({
	selector: 'ov-videoconference[participantPanelItemMuteButton], ov-participant-panel-item[muteButton]'
})
export class ParticipantPanelItemMuteButtonDirective implements AfterViewInit, OnDestroy {
	@Input() set participantPanelItemMuteButton(value: boolean) {
		this.muteValue = value;
		this.update(this.muteValue);
	}
	@Input() set muteButton(value: boolean) {
		this.muteValue = value;
		this.update(this.muteValue);
	}

	muteValue: boolean = true;

	constructor(public elementRef: ElementRef, private libService: OpenViduAngularConfigService) {}

	ngAfterViewInit() {
		this.update(this.muteValue);
	}
	ngOnDestroy(): void {
		this.clear();
	}
	clear() {
		this.muteValue = true;
		this.update(true);
	}

	update(value: boolean) {
		if (this.libService.participantItemMuteButton.getValue() !== value) {
			this.libService.participantItemMuteButton.next(value);
		}
	}
}