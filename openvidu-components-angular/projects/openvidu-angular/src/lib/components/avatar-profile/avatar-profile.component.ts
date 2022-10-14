import { Component, Input } from '@angular/core';

/**
 * @internal
 */

@Component({
	selector: 'ov-avatar-profile',
	template: `
		<div class="poster">
			<div class="initial" [ngStyle]="{ 'background-color': color }">
				<span id="poster-text">{{ letter }}</span>
			</div>
		</div>
	`,
	styleUrls: ['./avatar-profile.component.css']
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
