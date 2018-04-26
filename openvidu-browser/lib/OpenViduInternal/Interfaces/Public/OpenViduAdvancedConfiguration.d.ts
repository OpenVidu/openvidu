export interface OpenViduAdvancedConfiguration {
    /**
     * Array of [RTCIceServer](https://developer.mozilla.org/en-US/docs/Web/API/RTCIceServer) to be used by OpenVidu Browser instead of the default free ice server array (got from [freeice](https://github.com/DamonOehlman/freeice) library)
     */
    iceServers?: RTCIceServer[];
    /**
     * URL to a custom screen share extension for Chrome (always based on ours: [openvidu-screen-sharing-chrome-extension](https://github.com/OpenVidu/openvidu-screen-sharing-chrome-extension)) to be used instead of the default one.
     * Must be something like this: `https://chrome.google.com/webstore/detail/YOUR_WEBSTORE_EXTENSION_NAME/YOUR_EXTENSION_ID`
     */
    screenShareChromeExtension?: string;
    /**
     * Custom configuration for the [[PublisherSpeakingEvent]] feature. It is an object which includes the following optional properties:
     * - `interval`: (number) how frequently the analyser polls the audio stream to check if speaking has started or stopped. Default **50** (ms)
     * - `threshold`: (number) the volume at which _publisherStartSpeaking_ and _publisherStopSpeaking_ events will be fired. Default **-50** (dB)
     */
    publisherSpeakingEventsOptions?: any;
}
