import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { BackgroundEffect, EffectType } from '../../models/background-effect.model';
import { ParticipantService } from '../participant/participant.service';
import { TokenService } from '../token/token.service';

@Injectable({
	providedIn: 'root'
})
export class VirtualBackgroundService {
	backgroundSelected = <BehaviorSubject<string>>new BehaviorSubject('');
	backgroundSelectedObs: Observable<string>;
	backgrounds: BackgroundEffect[] = [
		{ id: 'no_effect', type: EffectType.NONE, thumbnail: 'block', description: 'No background effect' },
		{ id: 'soft_blur', type: EffectType.BLUR, thumbnail: 'blur_on', description: 'Blur effect' },
		{ id: '1', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-1.jpg', src: 'assets/backgrounds/bg-1.jpg' },
		{ id: '2', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-2.jpg', src: 'assets/backgrounds/bg-2.jpg' },
		{ id: '3', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-3.jpg', src: 'assets/backgrounds/bg-3.png' },
		{ id: '4', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-4.jpg', src: 'assets/backgrounds/bg-4.png' },
		{ id: '5', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-5.jpg', src: 'assets/backgrounds/bg-5.png' },
		{ id: '6', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-6.jpg', src: 'assets/backgrounds/bg-6.png' },
		{ id: '7', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-7.jpg', src: 'assets/backgrounds/bg-7.png' },
		{ id: '8', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-8.jpg', src: 'assets/backgrounds/bg-8.png' },
		{ id: '9', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-9.jpg', src: 'assets/backgrounds/bg-9.png' },
		{ id: '10', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-10.jpg', src: 'assets/backgrounds/bg-10.png' }
	];

	constructor(private participantService: ParticipantService, private tokenService: TokenService) {
		this.backgroundSelectedObs = this.backgroundSelected.asObservable();
	}

	getBackgrounds(): any[] {
		return this.backgrounds;
	}
	async applyBackground(effect: BackgroundEffect) {
		this.backgroundSelected.next(effect.id);

		let options = { token: this.tokenService.getWebcamToken(), url: '' };
		if (effect.type === EffectType.IMAGE) {
			options.url = effect.src;
		}

		console.log(`VB:${effect.type.toLowerCase()}`);
		console.log(options)
		await this.participantService.getMyCameraPublisher().stream.applyFilter(`VB:${effect.type.toLowerCase()}`, options);
	}

	async removeBackground() {
		this.backgroundSelected.next('no_effect');
		await this.participantService.getMyCameraPublisher().stream.removeFilter();
	}
}
