import { VideoInsertMode } from '../../Enums/VideoInsertMode';
export interface StreamManagerVideo {
    /**
     * DOM video element displaying the StreamManager's stream
     */
    video: HTMLVideoElement;
    /**
     * `id` attribute of the DOM video element displaying the StreamManager's stream
     */
    id: string;
    /**
     * The DOM HTMLElement assigned as target element when creating a video for the StreamManager. This property is defined when:
     * - [[OpenVidu.initPublisher]] or [[Session.subscribe]] methods have been called passing a valid `targetElement` parameter.
     * - [[SessionManager.createVideoElement]] has been called.
     *
     * This property is undefined when:
     * - [[OpenVidu.initPublisher]] or [[Session.subscribe]] methods have been called passing *null* or *undefined* as `targetElement` parameter.
     * - [[SessionManager.addVideoElement]] has been called.
     */
    targetElement?: HTMLElement;
    /**
     * How the DOM video element should be inserted with respect to `targetElement`. This property is defined when:
     * - [[OpenVidu.initPublisher]] or [[Session.subscribe]] methods have been called passing a valid `targetElement` parameter.
     * - [[SessionManager.createVideoElement]] has been called.
     *
     * This property is undefined when:
     * - [[OpenVidu.initPublisher]] or [[Session.subscribe]] methods have been called passing *null* or *undefined* as `targetElement` parameter.
     * - [[SessionManager.addVideoElement]] has been called.
     */
    insertMode?: VideoInsertMode;
}
