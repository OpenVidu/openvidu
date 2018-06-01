import { StreamManager } from '../../OpenVidu/StreamManager';
import { Session } from '../../OpenVidu/Session';
export declare abstract class Event {
    /**
     * Whether the event has a default behaviour that may be prevented by calling [[Event.preventDefault]]
     */
    cancelable: boolean;
    /**
     * The object that dispatched the event
     */
    target: Session | StreamManager;
    /**
     * The type of event. This is the same string you pass as first parameter when calling method `on()` of any object implementing [[EventDispatcher]] interface
     */
    type: string;
    private hasBeenPrevented;
    /**
     * @hidden
     */
    constructor(cancelable: boolean, target: Session | StreamManager, type: string);
    /**
     * Whether the default beahivour of the event has been prevented or not. Call [[Event.preventDefault]] to prevent it
     */
    isDefaultPrevented(): boolean;
    /**
     * Prevents the default behaviour of the event. The following events have a default behaviour:
     *
     * - `sessionDisconnected`: dispatched by [[Session]] object, automatically unsubscribes the leaving participant from every Subscriber object of the session (this includes closing the WebRTCPeer connection and disposing all MediaStreamTracks)
     * and also deletes any HTML video element associated to each Subscriber (only those created by OpenVidu Browser, either by passing a valid parameter as `targetElement` in method [[Session.subscribe]] or
     * by calling [[Subscriber.createVideoElement]]). For every video removed, each Subscriber object will also dispatch a `videoElementDestroyed` event.
     *
     * - `streamDestroyed`:
     *   - If dispatched by a [[Publisher]] (*you* have unpublished): automatically stops all media tracks and deletes any HTML video element associated to it (only those created by OpenVidu Browser, either by passing a valid parameter as `targetElement`
     * in method [[OpenVidu.initPublisher]] or by calling [[Publisher.createVideoElement]]). For every video removed, the Publisher object will also dispatch a `videoElementDestroyed` event.
     *   - If dispatched by [[Session]] (*other user* has unpublished): automatically unsubscribes the proper Subscriber object from the session (this includes closing the WebRTCPeer connection and disposing all MediaStreamTracks)
     * and also deletes any HTML video element associated to that Subscriber (only those created by OpenVidu Browser, either by passing a valid parameter as `targetElement` in method [[Session.subscribe]] or
     * by calling [[Subscriber.createVideoElement]]). For every video removed, the Subscriber object will also dispatch a `videoElementDestroyed` event.
     */
    preventDefault(): void;
    protected abstract callDefaultBehaviour(): any;
}
