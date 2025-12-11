import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
	selector: 'ov-video-poster',
	templateUrl: './video-poster.component.html',
	styleUrl: './video-poster.component.scss',
	standalone: true,
	imports: [CommonModule, TranslatePipe]
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
