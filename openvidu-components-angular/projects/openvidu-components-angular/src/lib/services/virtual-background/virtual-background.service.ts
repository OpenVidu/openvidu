import { computed, Injectable, Signal } from '@angular/core';
import { SwitchBackgroundProcessorOptions } from '@livekit/track-processors';
import { BehaviorSubject, Observable } from 'rxjs';
import { BackgroundEffect, EffectType } from '../../models/background-effect.model';
import { ILogger } from '../../models/logger.model';
import { LoggerService } from '../logger/logger.service';
import { OpenViduService } from '../openvidu/openvidu.service';
import { StorageService } from '../storage/storage.service';

/**
 * @internal
 */
@Injectable({
	providedIn: 'root'
})
export class VirtualBackgroundService {
	backgroundIdSelected = <BehaviorSubject<string>>new BehaviorSubject('');
	backgroundIdSelected$: Observable<string>;
	backgrounds: BackgroundEffect[] = [
		{ id: 'no_effect', type: EffectType.NONE, thumbnail: 'block' },
		{ id: 'soft_blur', type: EffectType.BLUR, thumbnail: 'blur_on' },
		{ id: 'hard_blur', type: EffectType.BLUR, thumbnail: 'blur_on' },
		{ id: '1', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-1.jpg', src: 'assets/backgrounds/bg-1.jpg' },
		{ id: '2', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-2.jpg', src: 'assets/backgrounds/bg-2.jpg' },
		{ id: '3', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-3.jpg', src: 'assets/backgrounds/bg-3.jpg' },
		{ id: '4', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-4.jpg', src: 'assets/backgrounds/bg-4.jpg' },
		{ id: '5', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-5.jpg', src: 'assets/backgrounds/bg-5.jpg' },
		{ id: '6', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-6.jpg', src: 'assets/backgrounds/bg-6.jpg' },
		{ id: '7', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-7.jpg', src: 'assets/backgrounds/bg-7.jpg' },
		{ id: '8', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-8.jpg', src: 'assets/backgrounds/bg-8.jpg' },
		{ id: '9', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-9.jpg', src: 'assets/backgrounds/bg-9.jpg' },
		{ id: '10', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-10.jpg', src: 'assets/backgrounds/bg-10.jpg' },
		{ id: '11', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-11.jpg', src: 'assets/backgrounds/bg-11.jpg' },
		{ id: '12', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-12.jpg', src: 'assets/backgrounds/bg-12.jpg' },
		{ id: '13', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-13.jpg', src: 'assets/backgrounds/bg-13.jpg' },
		{ id: '14', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-14.jpg', src: 'assets/backgrounds/bg-14.jpg' },
		{ id: '15', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-15.jpg', src: 'assets/backgrounds/bg-15.jpg' },
		{ id: '16', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-16.jpg', src: 'assets/backgrounds/bg-16.jpg' },
		{ id: '17', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-17.jpg', src: 'assets/backgrounds/bg-17.jpg' },
		{ id: '18', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-18.jpg', src: 'assets/backgrounds/bg-18.jpg' },
		{ id: '19', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-19.jpg', src: 'assets/backgrounds/bg-19.jpg' }
	];

	private SOFT_BLUR_INTENSITY = 20;
	private HARD_BLUR_INTENSITY = 60;

	private log: ILogger;

	constructor(
		private openviduService: OpenViduService,
		private storageService: StorageService,
		private loggerSrv: LoggerService
	) {
		this.log = this.loggerSrv.get('VirtualBackgroundService');
		this.backgroundIdSelected$ = this.backgroundIdSelected.asObservable();
	}

	getBackgrounds(): BackgroundEffect[] {
		return this.backgrounds;
	}

	/**
	 * Computed signal that checks if virtual background is supported (requires GPU).
	 * Reactively tracks the support status from OpenViduService.
	 */
	readonly isVirtualBackgroundSupported: Signal<boolean> = computed(() =>
		this.openviduService.isBackgroundProcessorSupported()
	);

	isBackgroundApplied(): boolean {
		const bgSelected = this.backgroundIdSelected.getValue();
		return !!bgSelected && bgSelected !== 'no_effect';
	}

	async applyBackgroundFromStorage() {
		const bgId = this.storageService.getBackground();
		if (!!bgId) {
			const background = this.backgrounds.find((bg) => bg.id === bgId);
			if (background) {
				await this.applyBackground(background);
			}
		}
	}

	/**
	 * Applies a background effect to the local video track.
	 * Works both in prejoin (using OpenViduService's processor) and in-room states.
	 * The background processor is centralized in OpenViduService for consistency.
	 */
	async applyBackground(bg: BackgroundEffect) {
		// Check if virtual background is supported before proceeding
		if (!this.isVirtualBackgroundSupported()) {
			this.log.w('Virtual background not supported (GPU disabled). Skipping background application.');
			return;
		}

		// If the background is already applied, do nothing
		if (this.backgroundIsAlreadyApplied(bg.id)) return;

		try {
			const options = this.getBackgroundOptions(bg);
			await this.openviduService.switchBackgroundMode(options);

			this.storageService.setBackground(bg.id);
			this.backgroundIdSelected.next(bg.id);
			this.log.d('Background applied:', options);
		} catch (error) {
			this.log.e('Error applying background effect:', error);
		}
	}

	async removeBackground() {
		if (this.isBackgroundApplied()) {
			this.backgroundIdSelected.next('no_effect');
			try {
				await this.openviduService.switchBackgroundMode({ mode: 'disabled' });
			} catch (e) {
				this.log.w('Error disabling processor:', e);
			}
			this.storageService.removeBackground();
		}
	}

	private getBackgroundOptions(bg: BackgroundEffect): SwitchBackgroundProcessorOptions {
		if (bg.type === EffectType.NONE) {
			return { mode: 'disabled' };
		} else if (bg.type === EffectType.IMAGE && bg.src) {
			return { mode: 'virtual-background', imagePath: bg.src };
		} else if (bg.type === EffectType.BLUR) {
			return {
				mode: 'background-blur',
				blurRadius: bg.id === 'soft_blur' ? this.SOFT_BLUR_INTENSITY : this.HARD_BLUR_INTENSITY
			};
		}
		return { mode: 'disabled' };
	}

	private backgroundIsAlreadyApplied(backgroundId: string): boolean {
		return backgroundId === this.backgroundIdSelected.getValue();
	}
}
