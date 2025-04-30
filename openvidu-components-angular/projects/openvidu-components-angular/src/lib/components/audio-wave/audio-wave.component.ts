import { Component } from '@angular/core';

/**
 * @internal
 */
@Component({
	selector: 'ov-audio-wave',
	template: `<div class="audio-container">
		<div class="stick normal play"></div>
		<div class="stick loud play"></div>
		<div class="stick normal play"></div>
	</div>`,
	styleUrls: ['./audio-wave.component.scss'],
	standalone: false
})
export class AudioWaveComponent {}
