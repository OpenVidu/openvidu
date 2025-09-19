import { Component, EventEmitter, Input, Output, TemplateRef } from '@angular/core';

@Component({
	selector: 'ov-toolbar-panel-buttons',
	templateUrl: './toolbar-panel-buttons.component.html',
	styleUrl: './toolbar-panel-buttons.component.scss',
	standalone: false
})
export class ToolbarPanelButtonsComponent {
	// Inputs from toolbar
	@Input() isMinimal: boolean = false;
	@Input() isConnectionLost: boolean = false;
	@Input() isActivitiesOpened: boolean = false;
	@Input() isParticipantsOpened: boolean = false;
	@Input() isChatOpened: boolean = false;
	@Input() unreadMessages: number = 0;
	@Input() showActivitiesPanelButton: boolean = true;
	@Input() showParticipantsPanelButton: boolean = true;
	@Input() showChatPanelButton: boolean = true;
	@Input() recordingStatus: any;
	@Input() broadcastingStatus: any;
	@Input() _recordingStatus: any;
	@Input() _broadcastingStatus: any;
	@Input() toolbarAdditionalPanelButtonsTemplate: TemplateRef<any> | undefined;

	// Outputs back to toolbar
	@Output() toggleActivitiesPanel: EventEmitter<string | undefined> = new EventEmitter();
	@Output() toggleParticipantsPanel: EventEmitter<void> = new EventEmitter();
	@Output() toggleChatPanel: EventEmitter<void> = new EventEmitter();

	// Local methods that emit events
	onToggleActivities(expand?: string) {
		this.toggleActivitiesPanel.emit(expand);
	}

	onToggleParticipants() {
		this.toggleParticipantsPanel.emit();
	}

	onToggleChat() {
		this.toggleChatPanel.emit();
	}
}
