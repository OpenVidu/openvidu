import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { MatMenuPanel, MatMenuTrigger } from '@angular/material/menu';
import { VideoSizeIcon } from '../../models/icon.model';
import { ScreenType, VideoType } from '../../models/video-type.model';
import { DocumentService } from '../../services/document/document.service';
import { CdkOverlayService } from '../../services/cdk-overlay/cdk-overlay.service';
import { OpenViduService } from '../../services/openvidu/openvidu.service';
import { LayoutService } from '../../services/layout/layout.service';
import { StorageService } from '../../services/storage/storage.service';
import { Signal } from '../../models/signal.model';
import { PublisherProperties } from 'openvidu-browser';
import { StreamModel } from '../../models/participant.model';
import { ParticipantService } from '../../services/participant/participant.service';
import { OpenViduAngularConfigService } from '../../services/config/openvidu-angular.config.service';

@Component({
	selector: 'ov-stream',
	templateUrl: './stream.component.html',
	styleUrls: ['./stream.component.css']
})
export class StreamComponent implements OnInit {
	@ViewChild(MatMenuTrigger) public menuTrigger: MatMenuTrigger;
	@ViewChild('menu') menu: MatMenuPanel;

	videoSizeIconEnum = VideoSizeIcon;
	videoTypeEnum = VideoType;
	videoSizeIcon: VideoSizeIcon = VideoSizeIcon.BIG;
	toggleNickname: boolean;
	_stream: StreamModel;
	nickname: string;

	isMinimal: boolean = false;
	showNickname: boolean = true;
	showAudioDetection: boolean = true;
	showSettingsButton: boolean = true;

	private _streamContainer: ElementRef;

	private minimalSub: Subscription;
	private displayParticipantNameSub: Subscription;
	private displayAudioDetectionSub: Subscription;
	private settingsButtonSub: Subscription;

	constructor(
		protected documentService: DocumentService,
		protected openviduService: OpenViduService,
		protected layoutService: LayoutService,
		protected participantService: ParticipantService,
		protected storageService: StorageService,
		protected cdkSrv: CdkOverlayService,
		private libService: OpenViduAngularConfigService
	) {}

	@ViewChild('streamContainer', { static: false, read: ElementRef })
	set streamContainer(streamContainer: ElementRef) {
		setTimeout(() => {
			if (streamContainer) {
				this._streamContainer = streamContainer;
				// Remove 'no-size' css class for showing the element in the view.
				// This is a workaround for fixing a layout bug which provide a bad UX with each new elements created.
				this.documentService.removeNoSizeElementClass(this._streamContainer.nativeElement);
			}
		}, 0);
	}

	@Input()
	set stream(stream: StreamModel) {
		this._stream = stream;
		this.checkVideoEnlarged();
		if (this._stream.participant) {
			this.nickname = this._stream.participant.nickname;
		}
	}

	@ViewChild('nicknameInput')
	set nicknameInputElement(element: ElementRef) {
		setTimeout(() => {
			element?.nativeElement.focus();
		});
	}

	ngOnInit() {
		this.subscribeToStreamDirectives();
	}

	ngOnDestroy() {
		this.cdkSrv.setSelector('body');
		if (this.settingsButtonSub) this.settingsButtonSub.unsubscribe();
		if (this.displayAudioDetectionSub) this.displayAudioDetectionSub.unsubscribe();
		if (this.displayParticipantNameSub) this.displayParticipantNameSub.unsubscribe();
	}

	toggleVideoEnlarged() {
		if (!!this._stream.streamManager?.stream?.connection?.connectionId) {
			if (this.openviduService.isMyOwnConnection(this._stream.streamManager?.stream?.connection?.connectionId)) {
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
		this._stream.participant.setMutedForcibly(!this._stream.participant.isMutedForcibly);
	}

	toggleNicknameForm() {
		if (this._stream.participant.local) {
			this.toggleNickname = !this.toggleNickname;
		}
	}

	updateNickname(event) {
		if (event?.keyCode === 13 || event?.type === 'focusout') {
			if (!!this.nickname) {
				this.participantService.setMyNickname(this.nickname);
				this.storageService.setNickname(this.nickname);
				this.openviduService.sendSignal(Signal.NICKNAME_CHANGED, undefined, { clientData: this.nickname });
			}
			this.toggleNicknameForm();
		}
	}

	async replaceScreenTrack() {
		const properties: PublisherProperties = {
			videoSource: ScreenType.SCREEN,
			publishVideo: true,
			publishAudio: !this.participantService.isMyCameraActive(),
			mirror: false
		};
		await this.openviduService.replaceTrack(VideoType.SCREEN, properties);
	}

	private checkVideoEnlarged() {
		this.videoSizeIcon = this._stream.videoEnlarged ? VideoSizeIcon.NORMAL : VideoSizeIcon.BIG;
	}

	private subscribeToStreamDirectives() {

		this.minimalSub = this.libService.minimalObs.subscribe((value: boolean) => {
			this.isMinimal = value;
		});
		this.displayParticipantNameSub = this.libService.displayParticipantNameObs.subscribe((value: boolean) => {
			this.showNickname = value;
			// this.cd.markForCheck();
		});
		this.displayAudioDetectionSub = this.libService.displayAudioDetectionObs.subscribe((value: boolean) => {
			this.showAudioDetection = value;
			// this.cd.markForCheck();
		});
		this.settingsButtonSub = this.libService.settingsButtonObs.subscribe((value: boolean) => {
			this.showSettingsButton = value;
			// this.cd.markForCheck();
		});
	}
}
