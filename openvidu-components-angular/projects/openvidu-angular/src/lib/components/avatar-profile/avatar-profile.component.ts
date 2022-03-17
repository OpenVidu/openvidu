import { Component, Input } from '@angular/core';

@Component({
	selector: 'ov-avatar-profile',
	template: `
		<div class="poster" [ngStyle]="{ 'background-color': color }">
			<span id="poster-text">{{ letter }}</span>
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
