import { Connection } from '../../../OpenVidu/Connection';
/**
 * See [[Session.signal]]
 */
export interface SignalOptions {
    /**
     * The actual message of the signal.
     */
    data?: string;
    /**
     * The participants to whom to send the signal. They will only receive it if they are subscribed to
     * event `Session.on('signal')`. If empty or undefined, the signal will be send to all participants.
     */
    to?: Connection[];
    /**
     * The type of the signal. Participants subscribed to event `Session.on('signal:type')` will
     * receive it. Participants subscribed to `Session.on('signal')` will receive all signals.
     */
    type?: string;
}
