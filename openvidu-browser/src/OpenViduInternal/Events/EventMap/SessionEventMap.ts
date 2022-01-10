import { ConnectionEvent } from '../ConnectionEvent';
import { ConnectionPropertyChangedEvent } from '../ConnectionPropertyChangedEvent';
import { ExceptionEvent } from '../ExceptionEvent';
import { NetworkQualityLevelChangedEvent } from '../NetworkQualityLevelChangedEvent';
import { PublisherSpeakingEvent } from '../PublisherSpeakingEvent';
import { RecordingEvent } from '../RecordingEvent';
import { SessionDisconnectedEvent } from '../SessionDisconnectedEvent';
import { SignalEvent } from '../SignalEvent';
import { StreamEvent } from '../StreamEvent';
import { StreamPropertyChangedEvent } from '../StreamPropertyChangedEvent';

export interface SessionEventMap {
    connectionCreated: ConnectionEvent;
    connectionDestroyed: ConnectionEvent;
    connectionPropertyChanged: ConnectionPropertyChangedEvent;
    sessionDisconnected: SessionDisconnectedEvent;
    streamCreated: StreamEvent;
    streamDestroyed: StreamEvent;
    streamPropertyChanged: StreamPropertyChangedEvent;
    publisherStartSpeaking: PublisherSpeakingEvent;
    publisherStopSpeaking: PublisherSpeakingEvent;
    signal: SignalEvent;
    recordingStarted: RecordingEvent;
    recordingStopped: RecordingEvent;
    networkQualityLevelChanged: NetworkQualityLevelChangedEvent;
    reconnecting: never;
    reconnected: never;
    exception: ExceptionEvent;
}