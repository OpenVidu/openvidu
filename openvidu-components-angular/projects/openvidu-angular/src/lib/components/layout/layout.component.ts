import {
	AfterViewInit,
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	ContentChild,
	OnDestroy,
	OnInit,
	TemplateRef,
	ViewChild,
	ViewContainerRef
} from '@angular/core';
import { Subscription } from 'rxjs';
import { ParticipantService } from '../../services/participant/participant.service';
import { ParticipantAbstractModel } from '../../models/participant.model';
import { LayoutService } from '../../services/layout/layout.service';
import { StreamDirective } from '../../directives/template/openvidu-angular.directive';

/**
 *
 * The **LayoutComponent** is hosted inside of the {@link VideoconferenceComponent}.
 * It is in charge of displaying the participants streams layout.
 *
 * <div class="custom-table-container">
 *
 * <div>
 * <h3>OpenVidu Angular Directives</h3>
 *
 * The LayoutComponent can be replaced with a custom component. It provides us the following {@link https://angular.io/guide/structural-directives Angular structural directives}
 * for doing this.
 *
 * |            **Directive**           |                 **Reference**                 |
 * |:----------------------------------:|:---------------------------------------------:|
 * |            ***ovLayout**            |            {@link LayoutDirective}            |
 *
 * </br>
 *
 * It is also providing us a way to **replace the {@link StreamComponent Stream Component}** (<span class="italic">which is hosted inside of it</span>) with a custom one.
 * It will recognise the following directive in a child element.
 *
 *
 * |            **Directive**           |                 **Reference**                 |
 * |:----------------------------------:|:---------------------------------------------:|
 * |            ***ovStream**            |            {@link StreamDirective}            |
 *
 * <p class="component-link-text">
 * 	<span class="italic">See all {@link OpenViduAngularDirectiveModule OpenVidu Angular Directives}</span>
 * </p>
 * </div>
 * </div>
 */
@Component({
	selector: 'ov-layout',
	templateUrl: './layout.component.html',
	styleUrls: ['./layout.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class LayoutComponent implements OnInit, OnDestroy, AfterViewInit {
	/**
	 * @ignore
	 */
	@ContentChild('stream', { read: TemplateRef }) streamTemplate: TemplateRef<any>;

	/**
	 * @ignore
	 */
	@ViewChild('layout', { static: false, read: ViewContainerRef }) layoutContainer: ViewContainerRef;
	/**
	 * @ignore
	 */
	@ContentChild(StreamDirective)
	set externalStream(externalStream: StreamDirective) {
		// This directive will has value only when STREAM component tagget with '*ovStream' directive
		// is inside of the layout component tagged with '*ovLayout' directive
		if (externalStream) {
			this.streamTemplate = externalStream.template;
		}
	}

	localParticipant: ParticipantAbstractModel;
	remoteParticipants: ParticipantAbstractModel[] = [];
	/**
	 * @ignore
	 */
	subtitlesEnabled = true;

	private localParticipantSubs: Subscription;
	private remoteParticipantsSubs: Subscription;
	private subtitlesSubs: Subscription;

	/**
	 * @ignore
	 */
	constructor(protected layoutService: LayoutService, protected participantService: ParticipantService, private cd: ChangeDetectorRef) {}

	ngOnInit(): void {
		this.subscribeToParticipants();
		this.subscribeToSubtitles();
	}

	ngAfterViewInit() {
		this.layoutService.initialize(this.layoutContainer.element.nativeElement);
	}

	ngOnDestroy() {
		this.localParticipant = null;
		this.remoteParticipants = [];
		if (this.localParticipantSubs) this.localParticipantSubs.unsubscribe();
		if (this.remoteParticipantsSubs) this.remoteParticipantsSubs.unsubscribe();
		if (this.subtitlesSubs) this.subtitlesSubs.unsubscribe();
		this.layoutService.clear();
	}

	private subscribeToSubtitles() {
		this.subtitlesSubs = this.layoutService.subtitlesTogglingObs.subscribe((value: boolean) => {
			this.subtitlesEnabled = value;
			this.cd.markForCheck();
			this.layoutService.update();
		});
	}

	private subscribeToParticipants() {
		this.localParticipantSubs = this.participantService.localParticipantObs.subscribe((p) => {
			this.localParticipant = p;
			this.layoutService.update();
			this.cd.markForCheck();
		});

		this.remoteParticipantsSubs = this.participantService.remoteParticipantsObs.subscribe((participants) => {
			this.remoteParticipants = participants;
			this.layoutService.update();
			this.cd.markForCheck();
		});
	}
}
