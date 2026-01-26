import { ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, EventEmitter, Input, OnInit, Output, Signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { BackgroundEffect, EffectType } from '../../../models/background-effect.model';
import { PanelType } from '../../../models/panel.model';
import { PanelService } from '../../../services/panel/panel.service';
import { VirtualBackgroundService } from '../../../services/virtual-background/virtual-background.service';

/**
 * @internal
 */
@Component({
	selector: 'ov-background-effects-panel',
	templateUrl: './background-effects-panel.component.html',
	styleUrls: ['../panel.component.scss', './background-effects-panel.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	standalone: false
})
export class BackgroundEffectsPanelComponent implements OnInit {
	@Input() mode: 'prejoin' | 'meeting' = 'meeting';
	@Output() onClose = new EventEmitter<void>();

	backgroundSelectedId: string;
	effectType = EffectType;
	backgroundImages: BackgroundEffect[] = [];
	noEffectAndBlurredBackground: BackgroundEffect[] = [];
	private backgrounds: BackgroundEffect[] = [];
	private backgroundSubs: Subscription;

	/**
	 * @internal
	 * @param panelService
	 * @param backgroundService
	 * @param cd
	 */
	constructor(
		private panelService: PanelService,
		private backgroundService: VirtualBackgroundService,
		private cd: ChangeDetectorRef
	) {}

	/**
	 * Computed signal that reactively tracks if virtual background is supported.
	 * Updates automatically when browser support changes.
	 */
	readonly isVirtualBackgroundSupported: Signal<boolean> = computed(() =>
		this.backgroundService.isVirtualBackgroundSupported()
	);

	ngOnInit(): void {
		this.subscribeToBackgroundSelected();
		this.backgrounds = this.backgroundService.getBackgrounds();
		this.noEffectAndBlurredBackground = this.backgrounds.filter((f) => f.type === EffectType.BLUR || f.type === EffectType.NONE);
		this.backgroundImages = this.backgrounds.filter((f) => f.type === EffectType.IMAGE);
	}

	ngOnDestroy() {
		if (this.backgroundSubs) this.backgroundSubs.unsubscribe();
	}
	subscribeToBackgroundSelected() {
		this.backgroundSubs = this.backgroundService.backgroundIdSelected$.subscribe((id) => {
			this.backgroundSelectedId = id;
			this.cd.markForCheck();
		});
	}

	close() {
		if (this.mode === 'prejoin') {
			this.onClose.emit();
		} else {
			this.panelService.togglePanel(PanelType.BACKGROUND_EFFECTS);
		}
	}

	async applyBackground(effect: BackgroundEffect) {
		await this.backgroundService.applyBackground(effect);
	}
}
