import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { BackgroundEffect, EffectType } from '../../models/background-effect.model';
import { ParticipantService } from '../participant/participant.service';
import { StorageService } from '../storage/storage.service';
import { TokenService } from '../token/token.service';

/**
 * @internal
 */
@Injectable({
	providedIn: 'root'
})
export class VirtualBackgroundService {
	backgroundSelected = <BehaviorSubject<string>>new BehaviorSubject('');
	backgroundSelectedObs: Observable<string>;
	backgrounds: BackgroundEffect[] = [
		{ id: 'no_effect', type: EffectType.NONE, thumbnail: 'block' },
		{ id: 'soft_blur', type: EffectType.BLUR, thumbnail: 'blur_on' },
		{ id: '1', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-1.jpg', src: 'assets/backgrounds/bg-1.jpg' },
		{ id: '2', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-2.jpg', src: 'assets/backgrounds/bg-2.jpg' },
		{ id: '3', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-3.jpg', src: 'assets/backgrounds/bg-3.jpg' },
		{ id: '4', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-4.jpg', src: 'assets/backgrounds/bg-4.jpg' },
		{ id: '19', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-19.jpg', src: 'assets/backgrounds/bg-19.jpg' },
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
		{ id: '18', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-18.jpg', src: 'assets/backgrounds/bg-18.jpg' }
	];

	constructor(
		private participantService: ParticipantService,
		private storageService: StorageService,
		private tokenService: TokenService
	) {
		this.backgroundSelectedObs = this.backgroundSelected.asObservable();
	}

	getBackgrounds(): any[] {
		return this.backgrounds;
	}

	isBackgroundApplied(): boolean {
		const bgSelected = this.backgroundSelected.getValue();
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
		if (bg.id !== this.backgroundSelected.getValue()) {
			const filter = this.participantService.getMyCameraPublisher().stream.filter;
			const isBackgroundSelected = !!filter && filter.type.startsWith('VB:');
			let options = { token: this.tokenService.getWebcamToken(), url: '' };
			if (bg.type === EffectType.IMAGE) {
				options.url = bg.src;
			}

			if (isBackgroundSelected && this.hasSameTypeAsAbove(bg.type)) {
				this.replaceBackground(bg);
			} else {
				await this.removeBackground();
				await this.participantService.getMyCameraPublisher().stream.applyFilter(`VB:${bg.type.toLowerCase()}`, options);
			}
			this.storageService.setBackground(bg.id);
			this.backgroundSelected.next(bg.id);
		}
	}

	async removeBackground() {
		if (!!this.isBackgroundApplied()) {
			this.backgroundSelected.next('no_effect');
			await this.participantService.getMyCameraPublisher().stream.removeFilter();
			this.storageService.removeBackground();
		}
	}

	private async replaceBackground(effect: BackgroundEffect) {
		await this.participantService.getMyCameraPublisher().stream.filter.execMethod('update', { url: effect.src });
	}

	private hasSameTypeAsAbove(type: EffectType): boolean {
		const oldEffect = this.backgrounds.find((bg) => bg.id === this.backgroundSelected.getValue());
		return oldEffect?.type === type;
	}
}
