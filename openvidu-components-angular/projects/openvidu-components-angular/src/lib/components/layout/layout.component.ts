import { LayoutAdditionalElementsDirective } from '../../directives/template/internals.directive';

import { CdkDrag } from '@angular/cdk/drag-drop';
import {
	AfterViewInit,
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	ContentChild,
	ElementRef,
	OnDestroy,
	OnInit,
	TemplateRef,
	ViewChild,
	ViewContainerRef
} from '@angular/core';
import { combineLatest, map, Subject, takeUntil } from 'rxjs';
import { StreamDirective } from '../../directives/template/openvidu-components-angular.directive';
import { ParticipantModel, ParticipantTrackPublication } from '../../models/participant.model';
import { OpenViduComponentsConfigService } from '../../services/config/directive-config.service';
import { GlobalConfigService } from '../../services/config/global-config.service';
import { LayoutService } from '../../services/layout/layout.service';
import { PanelService } from '../../services/panel/panel.service';
import { ParticipantService } from '../../services/participant/participant.service';
import { LayoutTemplateConfiguration, TemplateManagerService } from '../../services/template/template-manager.service';

/**
 *
 * The **LayoutComponent** is hosted inside of the {@link VideoconferenceComponent}.
 * It is in charge of displaying the participants streams layout.
 */
@Component({
	selector: 'ov-layout',
	templateUrl: './layout.component.html',
	styleUrls: ['./layout.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	standalone: false
})
export class LayoutComponent implements OnInit, OnDestroy, AfterViewInit {
	/**
	 * @ignore
	 */
	@ContentChild('stream', { read: TemplateRef }) streamTemplate: TemplateRef<any>;

	/**
	 * @ignore
	 */
	@ContentChild('layoutAdditionalElements', { read: TemplateRef }) layoutAdditionalElementsTemplate: TemplateRef<any>;

	/**
	 * @ignore
	 */
	@ViewChild('layout', { static: false, read: ViewContainerRef }) layoutContainer: ViewContainerRef;

	/**
	 * @ignore
	 */
	@ViewChild(CdkDrag) cdkDrag: CdkDrag;

	/**
	 * @ignore
	 */
	@ViewChild('localLayoutElement', { static: false, read: ElementRef }) localLayoutElement: ElementRef;
	/**
	 * @ignore
	 */
	@ContentChild(StreamDirective)
	set externalStream(externalStream: StreamDirective) {
		// This directive will has value only when STREAM component tagget with '*ovStream' directive
		// is inside of the layout component tagged with '*ovLayout' directive
		if (externalStream) {
			this.streamTemplate = externalStream.template;
			this.updateTemplatesAndMarkForCheck();
		}
	}

	/**
	 * @ignore
	 */
	@ContentChild(LayoutAdditionalElementsDirective) set externalAdditionalElements(
		externalAdditionalElements: LayoutAdditionalElementsDirective
	) {
		if (externalAdditionalElements) {
			this._externalLayoutAdditionalElements = externalAdditionalElements;
			this.updateTemplatesAndMarkForCheck();
		}
	}

	/**
	 * @ignore
	 */
	templateConfig: LayoutTemplateConfiguration = {};

	localParticipant: ParticipantModel | undefined;
	remoteParticipants: ParticipantModel[] = [];
	/**
	 * @ignore
	 */
	captionsEnabled = true;

	private _externalStream?: StreamDirective;
	private _externalLayoutAdditionalElements?: LayoutAdditionalElementsDirective;

	private destroy$ = new Subject<void>();
	private resizeObserver: ResizeObserver;
	private resizeTimeout: NodeJS.Timeout;
	private videoIsAtRight: boolean = false;
	private lastLayoutWidth: number = 0;

	/**
	 * @ignore
	 */
	constructor(
		private layoutService: LayoutService,
		private panelService: PanelService,
		private participantService: ParticipantService,
		private globalService: GlobalConfigService,
		private directiveService: OpenViduComponentsConfigService,
		private cd: ChangeDetectorRef,
		private templateManagerService: TemplateManagerService
	) {}

	ngOnInit(): void {
		this.setupTemplates();

		this.subscribeToParticipants();
		this.subscribeToCaptions();
	}

	ngAfterViewInit() {
		console.log('LayoutComponent.ngAfterViewInit');
		this.layoutService.initialize(this.layoutContainer.element.nativeElement);
		this.lastLayoutWidth = this.layoutContainer.element.nativeElement.getBoundingClientRect().width;
		this.listenToResizeLayout();
		this.listenToCdkDrag();
	}

	ngOnDestroy() {
		this.destroy$.next();
		this.destroy$.complete();
		this.localParticipant = undefined;
		this.remoteParticipants = [];
		this.resizeObserver?.disconnect();
		this.layoutService.clear();
	}

	/**
	 * @ignore
	 */
	trackParticipantElement(_: number, track: ParticipantTrackPublication) {
		// This method is used for trackBy in ngFor with the aim of improving performance
		// https://angular.io/api/core/TrackByFunction
		return track;
	}

	private setupTemplates() {
		this.templateConfig = this.templateManagerService.setupLayoutTemplates(
			this._externalStream,
			this._externalLayoutAdditionalElements
		);

		// Apply templates to component properties for backward compatibility
		this.applyTemplateConfiguration();
	}

	private applyTemplateConfiguration() {
		if (this.templateConfig.layoutStreamTemplate) {
			this.streamTemplate = this.templateConfig.layoutStreamTemplate;
		}
		if (this.templateConfig.layoutAdditionalElementsTemplate) {
			this.layoutAdditionalElementsTemplate = this.templateConfig.layoutAdditionalElementsTemplate;
		}
	}

	/**
	 * @internal
	 * Updates templates and triggers change detection
	 */
	private updateTemplatesAndMarkForCheck(): void {
		this.setupTemplates();
		this.cd.markForCheck();
	}

	private subscribeToCaptions() {
		this.layoutService.captionsTogglingObs.pipe(takeUntil(this.destroy$)).subscribe((value: boolean) => {
			this.captionsEnabled = value;
			this.cd.markForCheck();
			this.layoutService.update();
		});
	}

	private subscribeToParticipants() {
		this.participantService.localParticipant$.pipe(takeUntil(this.destroy$)).subscribe((p) => {
			if (p) {
				this.localParticipant = p;
				if (!this.localParticipant?.isMinimized) {
					this.videoIsAtRight = false;
				}
				this.layoutService.update();
				this.cd.markForCheck();
			}
		});

		combineLatest([this.participantService.remoteParticipants$, this.directiveService.layoutRemoteParticipants$])
			.pipe(
				map(([serviceParticipants, directiveParticipants]) =>
					directiveParticipants !== undefined ? directiveParticipants : serviceParticipants
				),
				takeUntil(this.destroy$)
			)
			.subscribe((participants) => {
				this.remoteParticipants = participants;
				this.layoutService.update();
				this.cd.markForCheck();
			});
	}

	private listenToResizeLayout() {
		this.resizeObserver = new ResizeObserver((entries) => {
			clearTimeout(this.resizeTimeout);

			this.resizeTimeout = setTimeout(() => {
				if (this.localParticipant?.isMinimized) {
					const { width: parentWidth } = entries[0].contentRect;
					if (this.panelService.isPanelOpened()) {
						if (this.lastLayoutWidth < parentWidth) {
							// Layout is bigger than before. Maybe the settings panel(wider) has been transitioned to another panel.
							if (this.videoIsAtRight) {
								this.moveStreamToRight(parentWidth);
							}
						} else {
							// Layout is smaller than before. Emit resize event to update video position.
							window.dispatchEvent(new Event('resize'));
							const { x, width } = this.cdkDrag.element.nativeElement.getBoundingClientRect();
							this.videoIsAtRight = x + width >= parentWidth;
						}
					} else {
						if (this.videoIsAtRight) {
							// Panel is closed and layout has been resized. Video is at right, so move it to right.
							this.moveStreamToRight(parentWidth);
						}
					}
					this.lastLayoutWidth = parentWidth;
				}
			}, 100);
		});

		this.resizeObserver.observe(this.layoutContainer.element.nativeElement);
	}
	private moveStreamToRight(parentWidth: number) {
		const { y, width: elementWidth } = this.cdkDrag.element.nativeElement.getBoundingClientRect();
		const margin = 10;
		const newX = parentWidth - elementWidth - margin;
		this.cdkDrag.setFreeDragPosition({ x: newX, y });
	}

	private listenToCdkDrag() {
		const handler = (event) => {
			if (!this.panelService.isPanelOpened()) return;
			const { x, width } = this.localLayoutElement.nativeElement.getBoundingClientRect();
			const { width: parentWidth } = this.layoutContainer.element.nativeElement.getBoundingClientRect();
			if (x === 0) {
				// Video is at the left
				this.videoIsAtRight = false;
			} else if (x + width >= parentWidth) {
				// Video is at the right
				this.videoIsAtRight = true;
			} else {
				// Video is in another position
				this.videoIsAtRight = false;
			}
		};

		this.cdkDrag.released.pipe(takeUntil(this.destroy$)).subscribe(handler);

		if (this.globalService.isProduction()) return;
		// Just for allow E2E testing with drag and drop
		document.addEventListener('webcomponentTestingEndedDragAndDropEvent', handler);
		document.addEventListener('webcomponentTestingEndedDragAndDropRightEvent', (event: any) => {
			const { x, y } = event.detail;
			this.cdkDrag.setFreeDragPosition({ x, y });
		});
	}
}
