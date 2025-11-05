import { Component, Input } from '@angular/core';

@Component({
	selector: 'ov-video-poster',
	templateUrl: './video-poster.component.html',
	styleUrl: './video-poster.component.scss',
	standalone: false
})
export class VideoPosterComponent {
	letter: string = '';

	@Input()
	set nickname(name: string) {
		if (name) this.letter = name[0];
	}
	@Input() color: string = '#000000';
	@Input() showAvatar: boolean = true;

	@Input() hasEncryptionError: boolean = false;
}
