import {
	Component,
	Input,
	OnInit,
	Output,
	EventEmitter,
	ViewChild,
	ChangeDetectorRef,
	AfterViewInit,
	ViewContainerRef
} from '@angular/core';
import { LibraryConfigService } from '../../services/library-config/library-config.service';
import { ToolbarComponent } from '../toolbar/toolbar.component';

@Component({
	selector: 'ov-videoconference',
	templateUrl: './videoconference.component.html',
	styleUrls: ['./videoconference.component.css']
})
export class VideoconferenceComponent implements OnInit, AfterViewInit {
	@Input() sessionName: string;
	@Input() userName: string;
	@Input() openviduServerUrl: string;
	@Input() openviduSecret: string;
	// @Input() tokens: { webcam: string; screen: string };

	@Output() onJoinClicked = new EventEmitter<any>();
	@Output() onCloseClicked = new EventEmitter<any>();

	joinSessionClicked: boolean = false;
	closeClicked: boolean = false;
	isSessionAlive: boolean = false;
	_tokens: { webcam: string; screen: string };
	error: boolean = false;
	errorMessage: string = '';

	_toolbar: ViewContainerRef;

	constructor(protected libraryConfigSrv: LibraryConfigService, private cd: ChangeDetectorRef) {}

	// @ViewChild('toolbar', { static: false, read: ViewContainerRef })
	// set toolbar(reference: ViewContainerRef) {
	// 	setTimeout(() => {
	// 		console.log('setting ref', reference);
	// 		this._toolbar = reference;

	// 		if (this._toolbar) {
	// 			let component = ToolbarComponent;
	// 			if (this.libraryConfigSrv.isCustomComponentDefined('ov-toolbar')) {
	// 				component = this.libraryConfigSrv.getToolbarComponent();
	// 			}
	// 			this._toolbar?.clear();
	// 			this._toolbar.createComponent(component);
	// 		}
	// 	}, 100);
	// }

	ngAfterViewInit() {
		// if(this.customToolbar && this.libraryConfigSrv.isCustomComponentDefined('ov-toolbar')){
		// 	const viewContainerRef = this.customToolbar.viewContainerRef;
		// 	viewContainerRef.clear();
		// 	const componentRef = viewContainerRef.createComponent<any>(this.libraryConfigSrv.getToolbarComponent());
		// } else {
		// 	this.customToolbar.viewContainerRef.clear();
		// 	const viewContainerRef = this.toolbar.viewContainerRef;
		// 	viewContainerRef.clear();
		// 	viewContainerRef.createComponent<any>(ToolbarComponent);
		// }
	}

	ngOnInit() {
	}

	@Input('tokens')
	set tokens(tokens: { webcam: string; screen: string }) {
		if (!!tokens?.webcam || !!this.tokens?.screen) {
			// 1 token received
			this.cd.detectChanges();
			// this.cd.markForCheck();
			this._tokens = tokens;
			this.joinSessionClicked = true;
			this.isSessionAlive = true;
		} else {
			//No tokens received
			throw new Error('No tokens received');
		}
	}

	async _onJoinClicked() {
		this.onJoinClicked.emit();
		// if (!this.tokens || (!this.tokens?.webcam && !this.tokens?.screen)) {
		// 	//No tokens received

		// 	if (!!this.sessionName && !!this.openviduServerUrl && !!this.openviduSecret) {
		// 		// Generate tokens
		// 		this._tokens = {
		// 			webcam: await this.restService.getToken(this.sessionName, this.openviduServerUrl, this.openviduSecret),
		// 			screen: await this.restService.getToken(this.sessionName, this.openviduServerUrl, this.openviduSecret)
		// 		};
		// 	} else {
		// 		// No tokens received and can't generate them
		// 		this.error = true;
		// 		this.errorMessage = `Cannot access to OpenVidu Server with url '${this.openviduServerUrl}' to genere tokens for session '${this.sessionName}'`;
		// 		throw this.errorMessage;
		// 	}
		// } else if (!this.tokens?.webcam || !this.tokens?.screen) {
		// 	// 1 token received
		// 	const aditionalToken = await this.restService.getToken(this.sessionName, this.openviduServerUrl, this.openviduSecret);
		// 	this._tokens = {
		// 		webcam: !!this.tokens.webcam ? this.tokens.webcam : aditionalToken,
		// 		screen: !!this.tokens.screen ? this.tokens.screen : aditionalToken
		// 	};
		// } else {
		// 	// 2 tokens received.
		// 	this._tokens = {
		// 		webcam: this.tokens.webcam,
		// 		screen: this.tokens.screen
		// 	};
		// }
		// this.joinSessionClicked = true;
		// this.isSessionAlive = true;
	}
	onLeaveSessionClicked() {
		this.isSessionAlive = false;
		this.closeClicked = true;
	}

	onMicClicked() {}

	onCamClicked() {}

	onScreenShareClicked() {}

	onSpeakerLayoutClicked() {}
}
