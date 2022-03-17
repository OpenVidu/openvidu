import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ContentChild, OnInit, TemplateRef } from '@angular/core';
import { skip, Subscription } from 'rxjs';
import { ChatPanelDirective, ParticipantsPanelDirective } from '../../directives/template/openvidu-angular.directive';
import { MenuType } from '../../models/menu.model';
import { SidenavMenuService } from '../../services/sidenav-menu/sidenav-menu.service';

@Component({
	selector: 'ov-panel',
	templateUrl: './panel.component.html',
	styleUrls: ['./panel.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class PanelComponent implements OnInit {
	@ContentChild('participantsPanel', { read: TemplateRef }) participantsPanelTemplate: TemplateRef<any>;
	@ContentChild('chatPanel', { read: TemplateRef }) chatPanelTemplate: TemplateRef<any>;

	@ContentChild(ParticipantsPanelDirective)
	set externalParticipantPanel(externalParticipantsPanel: ParticipantsPanelDirective) {
		// This directive will has value only when PARTICIPANTS PANEL component tagged with '*ovParticipantsPanel'
		// is inside of the PANEL component tagged with '*ovPanel'
		if (externalParticipantsPanel) {
			this.participantsPanelTemplate = externalParticipantsPanel.template;
		}
	}

	@ContentChild(ChatPanelDirective)
	set externalChatPanel(externalChatPanel: ChatPanelDirective) {
		// This directive will has value only when CHAT PANEL component tagged with '*ovChatPanel'
		// is inside of the PANEL component tagged with '*ovPanel'
		if (externalChatPanel) {
			this.chatPanelTemplate = externalChatPanel.template;
		}
	}

	isParticipantsPanelOpened: boolean;
	isChatPanelOpened: boolean;
	menuSubscription: Subscription;
	constructor(protected menuService: SidenavMenuService, private cd: ChangeDetectorRef) {}

	ngOnInit(): void {
		this.subscribeToPanelToggling();
	}
	subscribeToPanelToggling() {
		this.menuSubscription = this.menuService.menuOpenedObs.pipe(skip(1)).subscribe((ev: { opened: boolean; type?: MenuType }) => {
			this.isChatPanelOpened = ev.opened && ev.type === MenuType.CHAT;
			this.isParticipantsPanelOpened = ev.opened && ev.type === MenuType.PARTICIPANTS;
			this.cd.markForCheck();
		});
	}

	ngOnDestroy() {
		this.isChatPanelOpened = false;
		this.isParticipantsPanelOpened = false;
		if (this.menuSubscription) this.menuSubscription.unsubscribe();
	}
}
