import { Component, TemplateRef, computed, input, output } from '@angular/core';
import { ViewportService } from '../../../services/viewport/viewport.service';

@Component({
	selector: 'ov-toolbar-panel-buttons',
	templateUrl: './toolbar-panel-buttons.component.html',
	styleUrl: './toolbar-panel-buttons.component.scss',
	standalone: false
})
export class ToolbarPanelButtonsComponent {
	// Signal inputs from toolbar
	isMinimal = input<boolean>(false);
	isConnectionLost = input<boolean>(false);
	isActivitiesOpened = input<boolean>(false);
	isParticipantsOpened = input<boolean>(false);
	isChatOpened = input<boolean>(false);
	unreadMessages = input<number>(0);
	showActivitiesPanelButton = input<boolean>(true);
	showParticipantsPanelButton = input<boolean>(true);
	showChatPanelButton = input<boolean>(true);
	recordingStatus = input<any>();
	broadcastingStatus = input<any>();
	toolbarAdditionalPanelButtonsTemplate = input<TemplateRef<any> | undefined>();
	totalParticipants = input<number>(0);

	// Signal outputs back to toolbar
	toggleActivitiesPanel = output<string | undefined>();
	toggleParticipantsPanel = output<void>();
	toggleChatPanel = output<void>();

	// Computed signals
	visibleButtonsCount = computed(() => {
		let count = 0;
		if (!this.isMinimal() && this.showActivitiesPanelButton()) count++;
		if (!this.isMinimal() && this.showParticipantsPanelButton()) count++;
		if (!this.isMinimal() && this.showChatPanelButton()) count++;
		return count;
	});

	isAnyPanelOpened = computed(() => {
		return this.isActivitiesOpened() || this.isParticipantsOpened() || this.isChatOpened();
	});

	constructor(public viewportService: ViewportService) {}

	// Computed property to determine if we should show collapsed menu
	get shouldShowCollapsed(): boolean {
		return this.viewportService.isMobileView()
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
