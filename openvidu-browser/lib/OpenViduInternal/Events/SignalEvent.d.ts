import { Event } from './Event';
import { Connection } from '../../OpenVidu/Connection';
import { Session } from '../../OpenVidu/Session';
/**
 * Defines the following events:
 * - `signal`: dispatched by [[Session]]
 * - `signal:TYPE`: dispatched by [[Session]]
 */
export declare class SignalEvent extends Event {
    /**
     * The type of signal (can be empty).
     *
     * The client must be subscribed to `Session.on('signal:type', function(signalEvent) {...})` to receive this object in the callback.
     *
     * Subscribing to `Session.on('signal', function(signalEvent) {...})` will trigger all types of signals.
     */
    type: string;
    /**
     * The message of the signal (can be emtpy)
     */
    data: string;
    /**
     * The client that sent the signal
     */
    from: Connection;
    /**
     * @hidden
     */
    constructor(target: Session, type: string, data: string, from: Connection);
    /**
     * @hidden
     */
    callDefaultBehavior(): void;
}
