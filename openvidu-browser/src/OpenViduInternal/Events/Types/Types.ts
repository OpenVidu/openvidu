export type ChangedPropertyType =
    'videoActive' |
    'audioActive' |
    'videoTrack' |
    'audioTrack' |
    'videoDimensions' |
    'filter';

export type StreamPropertyChangedEventReason =
    'publishVideo' |
    'publishAudio' |
    'trackReplaced' |
    'deviceRotated' |
    'screenResized' |
    'applyFilter' |
    'execFilterMethod' |
    'removeFilter';

export type ConnectionEventReason =
    'disconnect' |
    'forceDisconnectByUser' |
    'forceDisconnectByServer' |
    'sessionClosedByServer' |
    'networkDisconnect' |
    'nodeCrashed' |
    '';

export type StreamEventReason =
    ConnectionEventReason |
    'unpublish' |
    'forceUnpublishByUser' |
    'forceUnpublishByServer';

export type RecordingEventReason =
    'recordingStoppedByServer' |
    'sessionClosedByServer' |
    'automaticStop' |
    'nodeCrashed';

export type SpeechToTextEventReason =
    'recognizing' |
    'recognized';