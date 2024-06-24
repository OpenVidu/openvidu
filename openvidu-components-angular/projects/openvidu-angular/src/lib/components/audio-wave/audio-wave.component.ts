import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { PublisherSpeakingEvent, StreamManager } from 'openvidu-browser-v2compatibility';

/**
 * @internal
 */
@Component({
	selector: 'ov-audio-wave',
	templateUrl: './audio-wave.component.html',
	styleUrls: ['./audio-wave.component.css']
})
export class AudioWaveComponent implements OnInit, OnDestroy {
	isSpeaking: boolean = false;

	@Input() streamManager: StreamManager;

	constructor() {}

	ngOnInit(): void {
		this.subscribeSpeakingEvents();
	}

	ngOnDestroy(): void {
		this.unsubscribeSpeakingEvents();
	}


	private subscribeSpeakingEvents() {
		if (this.streamManager) {
			this.streamManager.on('publisherStartSpeaking', (event: PublisherSpeakingEvent) => (this.isSpeaking = true));
			this.streamManager.on('publisherStopSpeaking', (event: PublisherSpeakingEvent) => (this.isSpeaking = false));
		}
	}

	private unsubscribeSpeakingEvents() {
		if (this.streamManager) {
			this.streamManager.off('publisherStartSpeaking');
			this.streamManager.off('publisherStopSpeaking');
		}
	}
}
