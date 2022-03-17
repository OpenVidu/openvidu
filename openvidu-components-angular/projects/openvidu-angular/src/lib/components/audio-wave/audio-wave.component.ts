import { Component, Input, OnDestroy, OnInit } from '@angular/core';

import { PublisherSpeakingEvent, StreamManager } from 'openvidu-browser';

@Component({
	selector: 'ov-audio-wave',
	templateUrl: './audio-wave.component.html',
	styleUrls: ['./audio-wave.component.css']
})
export class AudioWaveComponent implements OnInit, OnDestroy {
	isSpeaking: boolean = false;
	audioVolume: number = 0;

	private _streamManager: StreamManager;

	@Input()
	set streamManager(streamManager: StreamManager) {
		this._streamManager = streamManager;

		if(this._streamManager) {
			this._streamManager.on('publisherStartSpeaking', (event: PublisherSpeakingEvent) => {
				this.isSpeaking = true;
			});

			this._streamManager.on('publisherStopSpeaking', (event: PublisherSpeakingEvent) => {
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
	ngOnDestroy(): void {
		if(this._streamManager){
			this._streamManager.off('publisherStartSpeaking');
			this._streamManager.off('publisherStopSpeaking');
		}
	}

	ngOnInit(): void {}
}
