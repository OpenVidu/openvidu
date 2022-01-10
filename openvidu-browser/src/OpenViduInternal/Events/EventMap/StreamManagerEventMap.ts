import { PublisherSpeakingEvent } from '../PublisherSpeakingEvent';
import { StreamManagerEvent } from '../StreamManagerEvent';
import { StreamPropertyChangedEvent } from '../StreamPropertyChangedEvent';
import { VideoElementEvent } from '../VideoElementEvent';

export interface StreamManagerEventMap {
    videoElementCreated: VideoElementEvent;
    videoElementDestroyed: VideoElementEvent;
    streamPlaying: StreamManagerEvent;
    streamAudioVolumeChange: StreamManagerEvent;
    streamPropertyChanged: StreamPropertyChangedEvent;
    publisherStartSpeaking: PublisherSpeakingEvent;
    publisherStopSpeaking: PublisherSpeakingEvent;
}