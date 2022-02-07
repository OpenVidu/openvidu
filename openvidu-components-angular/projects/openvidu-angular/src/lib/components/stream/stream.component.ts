import { Component, ContentChild, ElementRef, HostListener, Input, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { MatMenuPanel, MatMenuTrigger } from '@angular/material/menu';
import { NicknameMatcher } from '../../matchers/nickname.matcher';
import { VideoSizeIcon } from '../../models/icon.model';
import { ScreenType, VideoType } from '../../models/video-type.model';
import { Storage } from '../../models/storage.model';
import { DocumentService } from '../../services/document/document.service';
import { CdkOverlayService } from '../../services/cdk-overlay/cdk-overlay.service';
import { WebrtcService } from '../../services/webrtc/webrtc.service';
import { LayoutService } from '../../services/layout/layout.service';
import { StorageService } from '../../services/storage/storage.service';
import { Signal } from '../../models/signal.model';
import { LayoutClass } from '../../models/layout.model';
import { PublisherProperties } from 'openvidu-browser';
import { StreamModel } from '../../models/participant.model';
import { ParticipantService } from '../../services/participant/participant.service';

@Component({
	selector: 'ov-stream',
	templateUrl: './stream.component.html',
	styleUrls: ['./stream.component.css']
})
export class StreamComponent implements OnInit {
	@ContentChild('notification', { read: TemplateRef }) notificationTemplate: TemplateRef<any>;

	videoSizeIconEnum = VideoSizeIcon;
	videoTypeEnum = VideoType;
	videoSizeIcon: VideoSizeIcon = VideoSizeIcon.BIG;
	mutedSound: boolean;
	toggleNickname: boolean;
	nicknameFormControl: FormControl;
	matcher: NicknameMatcher;
	_stream: StreamModel;
	private _streamContainer: ElementRef;
	@ViewChild(MatMenuTrigger) public menuTrigger: MatMenuTrigger;
	@ViewChild('menu') menu: MatMenuPanel;

	constructor(
		protected documentService: DocumentService,
		protected openViduWebRTCService: WebrtcService,
		protected layoutService: LayoutService,
		protected participantService: ParticipantService,
		protected storageService: StorageService,
		protected cdkSrv: CdkOverlayService
	) {}

	// @HostListener('document:fullscreenchange', ['$event'])
	// @HostListener('document:webkitfullscreenchange', ['$event'])
	// @HostListener('document:mozfullscreenchange', ['$event'])
	// @HostListener('document:MSFullscreenChange', ['$event'])
	// onFullscreenHandler(event) {
	// 	this.isFullscreenEnabled = !this.isFullscreenEnabled;
	// }

	@ViewChild('streamContainer', { static: false, read: ElementRef })
	set streamContainer(streamContainer: ElementRef) {
		setTimeout(() => {
			if (streamContainer) {
				this._streamContainer = streamContainer;
				if (this._stream.type === VideoType.SCREEN) {
					this.toggleVideoEnlarged(true);
				}
			}
		}, 0);
	}

	@Input()
	set stream(stream: StreamModel) {
		this._stream = stream;
		this.checkVideoEnlarged();
		this.nicknameFormControl = new FormControl(this._stream.nickname, [Validators.maxLength(25), Validators.required]);
	}

	@ViewChild('nicknameInput')
	set nicknameInputElement(element: ElementRef) {
		setTimeout(() => {
			element?.nativeElement.focus();
		});
	}

	ngOnInit() {
		this.matcher = new NicknameMatcher();
	}

	ngOnDestroy() {
		this.cdkSrv.setSelector('body');
	}

	toggleVideoEnlarged(resetAll?) {
		const element = this.documentService.getHTMLElementByClassName(this._streamContainer.nativeElement, LayoutClass.ROOT_ELEMENT);
		if (!!resetAll) {
			this.documentService.removeAllBigElementClass();
			this.participantService.resetMyVideoEnlarged();
			this.participantService.resetRemotesVideoEnlarged();
		}

		this.documentService.toggleBigElementClass(element);

		if (!!this._stream.streamManager?.stream?.connection?.connectionId) {
			if (this.openViduWebRTCService.isMyOwnConnection(this._stream.streamManager?.stream?.connection?.connectionId)) {
				this.participantService.toggleMyVideoEnlarged(this._stream.streamManager?.stream?.connection?.connectionId);
			} else {
				this.participantService.toggleRemoteVideoEnlarged(this._stream.streamManager?.stream?.connection?.connectionId);
			}
		}
		this.layoutService.update();
	}

	toggleVideoMenu(event) {
		if (this.menuTrigger.menuOpen) {
			this.menuTrigger.closeMenu();
			return;
		}
		this.cdkSrv.setSelector('#container-' + this._stream.streamManager?.stream?.streamId);
		this.menuTrigger.openMenu();
	}

	toggleSound() {
		this.mutedSound = !this.mutedSound;
	}

	toggleNicknameForm() {
		if (this._stream.local) {
			this.toggleNickname = !this.toggleNickname;
		}
	}

	eventKeyPress(event) {
		if (event && event.keyCode === 13 && this.nicknameFormControl.valid) {
			const nickname = this.nicknameFormControl.value;
			this.participantService.setNickname(this._stream.connectionId, nickname);
			this.storageService.set(Storage.USER_NICKNAME, nickname);
			this.openViduWebRTCService.sendSignal(Signal.NICKNAME_CHANGED, undefined, { clientData: nickname });
			this.toggleNicknameForm();
		}
	}

	async replaceScreenTrack() {
		const properties: PublisherProperties = {
			videoSource: ScreenType.SCREEN,
			publishVideo: true,
			publishAudio: !this.participantService.isMyCameraEnabled(),
			mirror: false
		};
		await this.openViduWebRTCService.replaceTrack(this.participantService.getMyScreenPublisher(), properties);
	}

	protected checkVideoEnlarged() {
		this.videoSizeIcon = this._stream.videoEnlarged ? VideoSizeIcon.NORMAL : VideoSizeIcon.BIG;
	}
}
