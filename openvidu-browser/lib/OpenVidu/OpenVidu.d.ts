import { LocalRecorder } from './LocalRecorder';
import { Publisher } from './Publisher';
import { Session } from './Session';
import { Stream } from './Stream';
import { Device } from '../OpenViduInternal/Interfaces/Public/Device';
import { OpenViduAdvancedConfiguration } from '../OpenViduInternal/Interfaces/Public/OpenViduAdvancedConfiguration';
import { PublisherProperties } from '../OpenViduInternal/Interfaces/Public/PublisherProperties';
/**
 * Entrypoint of OpenVidu Browser library.
 * Use it to initialize objects of type [[Session]], [[Publisher]] and [[LocalRecorder]]
 */
export declare class OpenVidu {
    private jsonRpcClient;
    /**
     * @hidden
     */
    session: Session;
    /**
     * @hidden
     */
    publishers: Publisher[];
    /**
     * @hidden
     */
    wsUri: string;
    /**
     * @hidden
     */
    secret: string;
    /**
     * @hidden
     */
    recorder: boolean;
    /**
     * @hidden
     */
    iceServers: RTCIceServer[];
    /**
     * @hidden
     */
    role: string;
    /**
     * @hidden
     */
    advancedConfiguration: OpenViduAdvancedConfiguration;
    constructor();
    /**
     * Returns new session
     */
    initSession(): Session;
    initPublisher(targetElement: string | HTMLElement): Publisher;
    initPublisher(targetElement: string | HTMLElement, properties: PublisherProperties): Publisher;
    initPublisher(targetElement: string | HTMLElement, completionHandler: (error: Error | undefined) => void): Publisher;
    initPublisher(targetElement: string | HTMLElement, properties: PublisherProperties, completionHandler: (error: Error | undefined) => void): Publisher;
    /**
     * Promisified version of [[OpenVidu.initPublisher]]
     *
     * > WARNING: events `accessDialogOpened` and `accessDialogClosed` will not be dispatched if using this method instead of [[OpenVidu.initPublisher]]
     */
    initPublisherAsync(targetElement: string | HTMLElement): Promise<Publisher>;
    initPublisherAsync(targetElement: string | HTMLElement, properties: PublisherProperties): Promise<Publisher>;
    /**
     * Returns a new local recorder for recording streams straight away from the browser
     * @param stream  Stream to record
     */
    initLocalRecorder(stream: Stream): LocalRecorder;
    /**
     * Checks if the browser supports OpenVidu
     * @returns 1 if the browser supports OpenVidu, 0 otherwise
     */
    checkSystemRequirements(): number;
    /**
     * Checks if the browser supports screen-sharing. Desktop Chrome, Firefox and Opera support screen-sharing
     * @returns 1 if the browser supports screen-sharing, 0 otherwise
     */
    checkScreenSharingCapabilities(): number;
    /**
     * Collects information about the media input devices available on the system. You can pass property `deviceId` of a [[Device]] object as value of `audioSource` or `videoSource` properties in [[initPublisher]] method
     */
    getDevices(): Promise<Device[]>;
    /**
     * Get a MediaStream object that you can customize before calling [[initPublisher]] (pass _MediaStreamTrack_ property of the _MediaStream_ value resolved by the Promise as `audioSource` or `videoSource` properties in [[initPublisher]])
     *
     * Parameter `options` is the same as in [[initPublisher]] second parameter (of type [[PublisherProperties]]), but only the following properties will be applied: `audioSource`, `videoSource`, `frameRate`, `resolution`
     *
     * To customize the Publisher's video, the API for HTMLCanvasElement is very useful. For example, to get a black-and-white video at 10 fps and HD resolution with no sound:
     * ```
     * var OV = new OpenVidu();
     * var FRAME_RATE = 10;
     *
     * OV.getUserMedia({
     *    audioSource: false;
     *    videoSource: undefined,
     *    resolution: '1280x720',
     *    frameRate: FRAME_RATE
     * })
     * .then(mediaStream => {
     *
     *    var videoTrack = mediaStream.getVideoTracks()[0];
     *    var video = document.createElement('video');
     *    video.srcObject = new MediaStream([videoTrack]);
     *
     *    var canvas = document.createElement('canvas');
     *    var ctx = canvas.getContext('2d');
     *    ctx.filter = 'grayscale(100%)';
     *
     *    video.addEventListener('play', () => {
     *      var loop = () => {
     *        if (!video.paused && !video.ended) {
     *          ctx.drawImage(video, 0, 0, 300, 170);
     *          setTimeout(loop, 1000/ FRAME_RATE); // Drawing at 10 fps
     *        }
     *      };
     *      loop();
     *    });
     *    video.play();
     *
     *    var grayVideoTrack = canvas.captureStream(FRAME_RATE).getVideoTracks()[0];
     *    var publisher = this.OV.initPublisher(
     *      myHtmlTarget,
     *      {
     *        audioSource: false,
     *        videoSource: grayVideoTrack
     *      });
     * });
     * ```
     */
    getUserMedia(options: PublisherProperties): Promise<MediaStream>;
    /**
     * Disable all logging except error level
     */
    enableProdMode(): void;
    /**
     * Set OpenVidu advanced configuration options. Currently `configuration` is an object with the following optional properties (see [[OpenViduAdvancedConfiguration]] for more details):
     * - `iceServers`: set custom STUN/TURN servers to be used by OpenVidu Browser
     * - `screenShareChromeExtension`: url to a custom screen share extension for Chrome to be used instead of the default one, based on ours [https://github.com/OpenVidu/openvidu-screen-sharing-chrome-extension](https://github.com/OpenVidu/openvidu-screen-sharing-chrome-extension)
     * - `publisherSpeakingEventsOptions`: custom configuration for the [[PublisherSpeakingEvent]] feature
     */
    setAdvancedConfiguration(configuration: OpenViduAdvancedConfiguration): void;
    /**
     * @hidden
     */
    generateMediaConstraints(publisherProperties: PublisherProperties): Promise<MediaStreamConstraints>;
    /**
     * @hidden
     */
    startWs(onConnectSucces: (error: Error) => void): void;
    /**
     * @hidden
     */
    closeWs(): void;
    /**
     * @hidden
     */
    sendRequest(method: string, params: any, callback?: any): void;
    /**
     * @hidden
     */
    getWsUri(): string;
    /**
     * @hidden
     */
    getSecret(): string;
    /**
     * @hidden
     */
    getRecorder(): boolean;
    private disconnectCallback;
    private reconnectingCallback;
    private reconnectedCallback;
    private isRoomAvailable;
}
