import { Component, EventEmitter, Input, Output, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppMaterialModule } from '../../../openvidu-components-angular.material.module';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { ViewportService } from '../../../services/viewport/viewport.service';

@Component({
	selector: 'ov-toolbar-panel-buttons',
	templateUrl: './toolbar-panel-buttons.component.html',
	styleUrl: './toolbar-panel-buttons.component.scss',
	standalone: true,
	imports: [CommonModule, AppMaterialModule, TranslatePipe]
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
	@Input() toolbarAdditionalPanelButtonsTemplate: TemplateRef<any> | undefined;

	// Outputs back to toolbar
	@Output() toggleActivitiesPanel: EventEmitter<string | undefined> = new EventEmitter();
	@Output() toggleParticipantsPanel: EventEmitter<void> = new EventEmitter();
	@Output() toggleChatPanel: EventEmitter<void> = new EventEmitter();

	constructor(public viewportService: ViewportService) {}

	// Computed property to determine if we should show collapsed menu
	get shouldShowCollapsed(): boolean {
		return this.viewportService.isMobileView()
	}

	// Get count of visible buttons
	get visibleButtonsCount(): number {
		let count = 0;
		if (!this.isMinimal && this.showActivitiesPanelButton) count++;
		if (!this.isMinimal && this.showParticipantsPanelButton) count++;
		if (!this.isMinimal && this.showChatPanelButton) count++;
		return count;
	}

	// Check if any panel is currently opened
	get isAnyPanelOpened(): boolean {
		return this.isActivitiesOpened || this.isParticipantsOpened || this.isChatOpened;
	}

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
