import { animate, style, transition, trigger } from '@angular/animations';
import { Component, Input } from '@angular/core';

/**
 * @internal
 */

@Component({
	selector: 'ov-avatar-profile',
	template: `
		<div class="poster" @posterAnimation>
			<div class="initial" [ngStyle]="{ 'background-color': color }">
				<span id="poster-text">{{ letter }}</span>
			</div>
		</div>
	`,
	styleUrls: ['./avatar-profile.component.css'],
	animations: [
		trigger('posterAnimation', [
			transition(':enter', [style({ opacity: 0 }), animate('600ms', style({ opacity: 1 }))])
			// transition(':leave', [animate(600, style({ backgroundColor: 'yellow' }))]),
		])
	]
})
export class AvatarProfileComponent {
	letter: string;

	@Input()
	set name(nickname: string) {
		this.letter = nickname[0];
	}
	@Input() color;

	constructor() {}
}
