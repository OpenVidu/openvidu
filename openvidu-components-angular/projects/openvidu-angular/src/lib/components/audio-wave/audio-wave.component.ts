import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { PublisherSpeakingEvent, StreamManager, StreamPropertyChangedEvent } from 'openvidu-browser';

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
		this.subscribeToStreamPropertyChanged();
	}

	ngOnDestroy(): void {
		this.unsubscribeSpeakingEvents();
		this.unsubscribePropertyChangedEvents();
	}

	private subscribeToStreamPropertyChanged() {
		if (this.streamManager) {
			this.streamManager.on('streamPropertyChanged', (event: StreamPropertyChangedEvent) => {
				if (event.reason === 'trackReplaced' && event.changedProperty === 'audioActive') {
					// TODO: When the audio track is replaced, the startSpeakingEvents is not fired by openvidu-browser
					this.unsubscribeSpeakingEvents();
					this.subscribeSpeakingEvents();
				}
			});
		}
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
	private unsubscribePropertyChangedEvents() {
		if (this.streamManager) {
			this.streamManager.off('streamPropertyChanged');
		}
	}
}
