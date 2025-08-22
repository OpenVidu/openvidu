import { Component, Input } from '@angular/core';

/**
 * @internal
 */

@Component({
	selector: 'ov-avatar-profile',
	template: `
		<div class="poster" id="video-poster">
			@if (letter) {
				<div class="initial" [ngStyle]="{ 'background-color': color }">
					<span id="poster-text">{{ letter }}</span>
				</div>
			}
		</div>
	`,
	styleUrls: ['./avatar-profile.component.scss'],
	standalone: false
})
export class AvatarProfileComponent {
	letter: string;

	@Input()
	set name(name: string) {
		if (name) this.letter = name[0];
	}
	@Input() color;

	constructor() {}
}
