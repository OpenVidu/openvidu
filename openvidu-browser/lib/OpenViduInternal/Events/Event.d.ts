import { Publisher } from '../../OpenVidu/Publisher';
import { Session } from '../../OpenVidu/Session';
import { Subscriber } from '../../OpenVidu/Subscriber';
export declare abstract class Event {
    /**
     * Whether the event has a default behaviour that may be prevented by calling [[Event.preventDefault]]
     */
    cancelable: boolean;
    /**
     * The object that dispatched the event
     */
    target: Session | Subscriber | Publisher;
    /**
     * The type of event. This is the same string you pass as first parameter when calling method `on()` of any object implementing [[EventDispatcher]] interface
     */
    type: string;
    private hasBeenPrevented;
    /**
     * @hidden
     */
    constructor(cancelable: any, target: any, type: any);
    /**
     * Whether the default beahivour of the event has been prevented or not. Call [[Event.preventDefault]] to prevent it
     */
    isDefaultPrevented(): boolean;
    /**
     * Prevents the default behaviour of the event. The following events have a default behaviour:
     * - `sessionDisconnected`: automatically unsubscribes the leaving participant from every Subscriber object of the session (this includes closing the WebRTCPeer connection and disposing all MediaStreamTracks)
     * and also deletes the HTML video element associated to it.
     * - `streamDestroyed`: if dispatched by a [[Publisher]] (_you_ have unpublished), automatically stops all media tracks and deletes the HTML video element associated to the stream. If dispatched by [[Session]],
     * (_other user_ has unpublished), automatically unsubscribes the proper Subscriber object from the session (this includes closing the WebRTCPeer connection and disposing all MediaStreamTracks) and deletes the HTML video element associated to it.
     */
    preventDefault(): void;
    protected abstract callDefaultBehaviour(): any;
}
