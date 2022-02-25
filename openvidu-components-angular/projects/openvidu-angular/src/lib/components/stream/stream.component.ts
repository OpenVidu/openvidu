import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { MatMenuPanel, MatMenuTrigger } from '@angular/material/menu';
import { NicknameMatcher } from '../../matchers/nickname.matcher';
import { VideoSizeIcon } from '../../models/icon.model';
import { ScreenType, VideoType } from '../../models/video-type.model';
import { DocumentService } from '../../services/document/document.service';
import { CdkOverlayService } from '../../services/cdk-overlay/cdk-overlay.service';
import { OpenViduService } from '../../services/openvidu/openvidu.service';
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

	@Input() showNickname: boolean = true;
	@Input() showAudioDetection: boolean = true;
	@Input() showSettings: boolean = true;

	constructor(
		protected documentService: DocumentService,
		protected openviduService: OpenViduService,
		protected layoutService: LayoutService,
		protected participantService: ParticipantService,
		protected storageService: StorageService,
		protected cdkSrv: CdkOverlayService
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
			this.storageService.setNickname(nickname);
			this.openviduService.sendSignal(Signal.NICKNAME_CHANGED, undefined, { clientData: nickname });
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

	protected checkVideoEnlarged() {
		this.videoSizeIcon = this._stream.videoEnlarged ? VideoSizeIcon.NORMAL : VideoSizeIcon.BIG;
	}
}
