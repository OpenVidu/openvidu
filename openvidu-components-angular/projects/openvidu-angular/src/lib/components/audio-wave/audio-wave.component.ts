import { Component, Input, OnInit } from '@angular/core';

import { PublisherSpeakingEvent, StreamManager } from 'openvidu-browser';

@Component({
	selector: 'ov-audio-wave',
	templateUrl: './audio-wave.component.html',
	styleUrls: ['./audio-wave.component.css']
})
export class AudioWaveComponent implements OnInit {
	isSpeaking: boolean = false;
	audioVolume: number = 0;

	@Input()
	set streamManager(streamManager: StreamManager) {

		if(streamManager) {
			streamManager.on('publisherStartSpeaking', (event: PublisherSpeakingEvent) => {
				this.isSpeaking = true;
			});

			streamManager.on('publisherStopSpeaking', (event: PublisherSpeakingEvent) => {
				this.isSpeaking = false;
			});

			// streamManager.on('streamAudioVolumeChange', (event: any) => {
			// 	// The loudest sounds on your system will be at 0dB
			// 	// and silence in webaudio is -100dB.
			// 	this.audioVolume = 100 + event.value.newValue;
			// 	console.log('Publisher audio volume change from ' + event.value.oldValue + ' to' + event.value.newValue);
			// 	console.log('AUDIO VOLUME', this.audioVolume);
			// });
		}

	}

	constructor() {}

	ngOnInit(): void {}
}
