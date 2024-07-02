import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { BackgroundEffect, EffectType } from '../../models/background-effect.model';
import { ParticipantService } from '../participant/participant.service';
import { StorageService } from '../storage/storage.service';
import { LocalTrack } from 'livekit-client';
import { BackgroundBlur, BackgroundOptions, ProcessorWrapper, VirtualBackground } from '@livekit/track-processors';
import { LoggerService } from '../logger/logger.service';
import { ILogger } from '../../models/logger.model';
import { ParticipantTrackPublication } from '../../models/participant.model';

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
	private HARD_BLUR_INTENSITY = 50;

	private log: ILogger;
	constructor(
		private participantService: ParticipantService,
		private storageService: StorageService,
		private loggerSrv: LoggerService
	) {
		this.log = this.loggerSrv.get('VirtualBackgroundService');
		this.backgroundIdSelected$ = this.backgroundIdSelected.asObservable();
	}

	getBackgrounds(): BackgroundEffect[] {
		return this.backgrounds;
	}

	isBackgroundApplied(): boolean {
		const bgSelected = this.backgroundIdSelected.getValue();
		return !!bgSelected && bgSelected !== 'no_effect';
	}

	async applyBackgroundFromStorage() {
		const bgId = this.storageService.getBackground();
		if (!!bgId) {
			const background = this.backgrounds.find((bg) => bg.id === bgId);
			if (background) {
				this.applyBackground(background);
			}
		}
	}

	async applyBackground(bg: BackgroundEffect) {
		if (this.backgroundIsAlreadyApplied(bg.id)) return;

		const cameraTracks = this.getCameraTracks();
		if (!cameraTracks) {
			this.log.e('No camera tracks found. Cannot apply background.');
			return;
		}

		const processor = this.getBackgroundProcessor(bg);
		if (!processor) {
			this.log.e('No processor found for the background effect.');
			return;
		}

		try {
			await this.removeBackground();
			await this.applyProcessorToCameraTracks(cameraTracks, processor);
			this.storageService.setBackground(bg.id);
			this.backgroundIdSelected.next(bg.id);
		} catch (error) {
			this.log.e('Error applying background effect:', error);
		}
	}

	async removeBackground() {
		if (this.isBackgroundApplied()) {
			this.backgroundIdSelected.next('no_effect');
			const tracks = this.participantService.getLocalParticipant()?.tracks;
			const promises = tracks?.map((t) => {
				return (t.track as LocalTrack).stopProcessor();
			});
			await Promise.all(promises || []);
			this.storageService.removeBackground();
		}
	}

	private getBackgroundProcessor(bg: BackgroundEffect): ProcessorWrapper<BackgroundOptions> | undefined {
		switch (bg.type) {
			case EffectType.IMAGE:
				if (bg.src) {
					return VirtualBackground(bg.src);
				}
				break;
			case EffectType.BLUR:
				if (bg.id === 'soft_blur') {
					return BackgroundBlur(this.SOFT_BLUR_INTENSITY);
				} else if (bg.id === 'hard_blur') {
					return BackgroundBlur(this.HARD_BLUR_INTENSITY);
				}
				break;
		}

		return undefined;
	}

	private async applyProcessorToCameraTracks(
		cameraTracks: ParticipantTrackPublication[],
		processor: ProcessorWrapper<BackgroundOptions>
	) {
		const promises = cameraTracks.map((track) => {
			return (track.track as LocalTrack).setProcessor(processor);
		});

		await Promise.all(promises || []);
	}

	private backgroundIsAlreadyApplied(backgroundId: string): boolean {
		return backgroundId === this.backgroundIdSelected.getValue();
	}

	private getCameraTracks(): ParticipantTrackPublication[] | undefined {
		const localParticipant = this.participantService.getLocalParticipant();
		return localParticipant?.cameraTracks;
	}

	// private async replaceBackground(bg: BackgroundEffect) {
	// 	await this.removeBackground();
	// 	await this.applyBackground(bg);
	// }

	// private hasSameTypeAsPreviousOne(type: EffectType): boolean {
	// 	const oldEffect = this.backgrounds.find((bg) => bg.id === this.backgroundSelected.getValue());
	// 	return oldEffect?.type === type;
	// }
}
