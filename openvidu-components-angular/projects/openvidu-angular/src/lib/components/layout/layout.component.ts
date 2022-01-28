import { AfterViewInit, Component, OnDestroy, OnInit, Type, ViewChild, ViewContainerRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { ParticipantService } from '../../services/participant/participant.service';
import { ParticipantAbstractModel } from '../../models/participant.model';
import { LayoutService } from '../../services/layout/layout.service';
import { LibraryComponents } from '../../config/lib.config';
import { LibraryConfigService } from '../../services/library-config/library-config.service';
import { StreamComponent } from '../stream/stream.component';

@Component({
	selector: 'ov-layout',
	templateUrl: './layout.component.html',
	styleUrls: ['./layout.component.css']
})
export class LayoutComponent implements OnInit, OnDestroy, AfterViewInit {
	_localStream: ViewContainerRef;
	_localStreamComponent: Type<any>;
	_remoteStream: ViewContainerRef;
	_remoteStreamComponent: Type<any>;

	localParticipant: ParticipantAbstractModel;
	remoteParticipants: ParticipantAbstractModel[] = [];
	protected localParticipantSubs: Subscription;
	protected remoteParticipantsSubs: Subscription;
	protected updateLayoutInterval: NodeJS.Timer;

	constructor(
		protected libraryConfigSrv: LibraryConfigService,
		protected layoutService: LayoutService,
		protected participantService: ParticipantService
	) {}

	@ViewChild('localStream', { static: false, read: ViewContainerRef })
	set stream(reference: ViewContainerRef) {
		setTimeout(() => {
			this._localStream = reference;

			if (this._localStream) {
				let component = StreamComponent;
				if (this.libraryConfigSrv.isCustomComponentDefined(LibraryComponents.STREAM)) {
					component = this.libraryConfigSrv.getCustomComponent(LibraryComponents.STREAM);
				}
				// this._stream?.clear();
				this._localStreamComponent = component;
				// this._stream.createComponent(component);
			}
		}, 0);
	}

	@ViewChild('remoteStream', { static: false, read: ViewContainerRef })
	set remoteStream(reference: ViewContainerRef) {
		setTimeout(() => {
			this._remoteStream = reference;

			if (this._remoteStream) {
				let component = StreamComponent;
				if (this.libraryConfigSrv.isCustomComponentDefined(LibraryComponents.STREAM)) {
					component = this.libraryConfigSrv.getCustomComponent(LibraryComponents.STREAM);
				}
				// this.remoteStream?.clear();
				this._remoteStreamComponent = component;
				// this._stream.createComponent(component);
			}
		}, 0);
	}

	ngOnInit(): void {
		this.subscribeToParticipants();
	}

	ngAfterViewInit() {}

	ngOnDestroy() {
		this.localParticipant = null;
		this.remoteParticipants = [];
		if (this.localParticipantSubs) this.localParticipantSubs.unsubscribe();
		if (this.remoteParticipantsSubs) this.remoteParticipantsSubs.unsubscribe();
	}

	protected subscribeToParticipants() {
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
