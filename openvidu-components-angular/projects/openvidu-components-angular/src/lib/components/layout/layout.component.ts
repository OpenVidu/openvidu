import { AfterViewInit, Component, ContentChild, HostListener, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { skip, Subscription } from 'rxjs';
import { SidenavMode } from '../../models/layout.model';
import { LayoutService } from '../../services/layout/layout.service';
import { ParticipantService } from '../../services/participant/participant.service';
import { SidenavMenuService } from '../../services/sidenav-menu/sidenav-menu.service';
import { ParticipantAbstractModel } from '../../models/participant.model';
import { MenuType } from '../../models/menu.model';

@Component({
	selector: 'ov-layout',
	templateUrl: './layout.component.html',
	styleUrls: ['./layout.component.css']
})
export class LayoutComponent implements OnInit, OnDestroy, AfterViewInit {
	@ContentChild('customLocalParticipant', { read: TemplateRef }) customLocalParticipantTemplate: TemplateRef<any>;
	@ContentChild('customRemoteParticipants', { read: TemplateRef }) customRemoteParticipantsTemplate: TemplateRef<any>;
	@ContentChild('customMenuContent', { read: TemplateRef }) customMenuContentTemplate: TemplateRef<any>;
	@ContentChild('customLayoutElement', { read: TemplateRef }) customLayoutElementTemplate: TemplateRef<any>;

	showCustomParticipant = true;
	sideMenu: MatSidenav;
	localParticipant: ParticipantAbstractModel;
	remoteParticipants: ParticipantAbstractModel[] = [];
	sidenavMode: SidenavMode = SidenavMode.SIDE;
	isParticipantsOpened: boolean;
	isChatOpened: boolean;
	protected readonly SIDENAV_WIDTH_LIMIT_MODE = 790;
	protected menuSubscription: Subscription;
	protected layoutWidthSubscription: Subscription;
	protected localParticipantSubs: Subscription;
	protected remoteParticipantsSubs: Subscription;
	protected updateLayoutInterval: NodeJS.Timer;

	@HostListener('window:resize')
	sizeChange() {
		this.layoutService.update();
	}

	constructor(
		protected participantService: ParticipantService,
		protected layoutService: LayoutService,
		protected menuService: SidenavMenuService
	) {}

	@ViewChild('sidenav')
	set sidenavMenu(menu: MatSidenav) {
		setTimeout(() => {
			if (menu) {
				this.sideMenu = menu;
				this.subscribeToTogglingMenu();
			}
		}, 0);
	}

	ngOnInit(): void {
		this.layoutService.initialize();
		this.subscribeToLayoutWidth();

		this.subscribeToUsers();
	}

	ngAfterViewInit() {}

	ngOnDestroy() {
		this.layoutService.clear();
		this.localParticipant = null;
		this.remoteParticipants = [];
		this.isChatOpened = false;
		this.isParticipantsOpened = false;
		if (this.menuSubscription) this.menuSubscription.unsubscribe();
		if (this.layoutWidthSubscription) this.layoutWidthSubscription.unsubscribe();
		if (this.localParticipantSubs) this.localParticipantSubs.unsubscribe();
		if (this.remoteParticipantsSubs) this.remoteParticipantsSubs.unsubscribe();
	}

	protected subscribeToTogglingMenu() {
		this.sideMenu.openedChange.subscribe(() => {
			if(this.updateLayoutInterval) {
				clearInterval(this.updateLayoutInterval);
			}
			this.layoutService.update();
		});

		this.sideMenu.openedStart.subscribe(() => {
			this.updateLayoutInterval = setInterval(() => this.layoutService.update(), 50);
		});

		this.sideMenu.closedStart.subscribe(() => {
			this.updateLayoutInterval = setInterval(() => this.layoutService.update(), 50);
		});

		this.menuSubscription = this.menuService.menuOpenedObs.pipe(skip(1)).subscribe((ev: { opened: boolean; type?: MenuType }) => {
			if (this.sideMenu) {
				this.isChatOpened = ev.opened && ev.type === MenuType.CHAT;
				this.isParticipantsOpened = ev.opened && ev.type === MenuType.PARTICIPANTS;
				ev.opened ? this.sideMenu.open() : this.sideMenu.close();
			}
		});
	}

	protected subscribeToLayoutWidth() {
		this.layoutWidthSubscription = this.layoutService.layoutWidthObs.subscribe((width) => {
			this.sidenavMode = width <= this.SIDENAV_WIDTH_LIMIT_MODE ? SidenavMode.OVER : SidenavMode.SIDE;
		});
	}

	protected subscribeToUsers() {
		this.localParticipantSubs = this.participantService.localParticipantObs.subscribe((p) => {
			this.localParticipant = p;
			this.layoutService.update();
		});

		this.remoteParticipantsSubs = this.participantService.remoteParticipantsObs.subscribe((participants) => {
			this.remoteParticipants = [...participants];
			this.layoutService.update();
		});
	}
}
