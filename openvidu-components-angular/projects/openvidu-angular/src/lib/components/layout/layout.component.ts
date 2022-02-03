import { AfterViewInit, Component, ComponentRef, ContentChild, Directive, Input, OnDestroy, OnInit, TemplateRef, Type, ViewChild, ViewContainerRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { ParticipantService } from '../../services/participant/participant.service';
import { ParticipantAbstractModel } from '../../models/participant.model';
import { LayoutService } from '../../services/layout/layout.service';

@Component({
	selector: 'ov-layout',
	templateUrl: './layout.component.html',
	styleUrls: ['./layout.component.css']
})
export class LayoutComponent implements OnInit, OnDestroy, AfterViewInit {
	// @ContentChild('customLocalParticipant', { read: TemplateRef }) customLocalParticipantTemplate: TemplateRef<any>;
	// @ContentChild('customRemoteParticipants', { read: TemplateRef }) customRemoteParticipantsTemplate: TemplateRef<any>;

	@ContentChild('stream', { read: TemplateRef }) streamTemplate: TemplateRef<any>;




	localParticipant: ParticipantAbstractModel;
	remoteParticipants: ParticipantAbstractModel[] = [];
	protected localParticipantSubs: Subscription;
	protected remoteParticipantsSubs: Subscription;
	protected updateLayoutInterval: NodeJS.Timer;

	constructor(protected layoutService: LayoutService, protected participantService: ParticipantService) {}

	ngOnInit(): void {
		this.layoutService.initialize();

		this.subscribeToUsers();
	}

	ngAfterViewInit() {}

	ngOnDestroy() {
		this.localParticipant = null;
		this.remoteParticipants = [];
		if (this.localParticipantSubs) this.localParticipantSubs.unsubscribe();
		if (this.remoteParticipantsSubs) this.remoteParticipantsSubs.unsubscribe();
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
