import { VideoInsertMode } from '../../Enums/VideoInsertMode';
/**
 * See [[Session.subscribe]]
 */
export interface SubscriberProperties {
    /**
     * How the video element of the subscriber should be inserted in the DOM
     * @default VideoInsertMode.APPEND
     */
    insertMode?: VideoInsertMode | string;
    /**
     * Whether to initially subscribe to the audio track of the stream or not. You can change the audio state later with [[Subscriber.subscribeToAudio]]
     * @default true
     */
    subscribeToAudio?: boolean;
    /**
     * Whether to initially subscribe to the video track of the stream or not. You can change the video state later with [[Subscriber.subscribeToVideo]]
     * @default true
     */
    subscribeToVideo?: boolean;
}
