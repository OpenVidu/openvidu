import { Event } from './Event';
import { Connection } from '../../OpenVidu/Connection';
import { Session } from '../..';
/**
 * Defines the following events:
 * - `publisherStartSpeaking`: dispatched by [[Session]]
 * - `publisherStopSpeaking`: dispatched by [[Session]]
 *
 * More information:
 * - This events will only be triggered for **remote streams that have audio tracks** ([[Stream.hasAudio]] must be true)
 * - Both events share the same lifecycle. That means that you can subscribe to only one of them if you want, but if you call `Session.off('publisherStopSpeaking')`,
 * keep in mind that this will also internally remove any 'publisherStartSpeaking' event
 * - You can further configure how the events are dispatched by setting property `publisherSpeakingEventsOptions` in the call of [[OpenVidu.setAdvancedConfiguration]]
 */
export declare class PublisherSpeakingEvent extends Event {
    /**
     * The client that started or stopped speaking
     */
    connection: Connection;
    /**
     * The streamId of the Stream affected by the speaking event
     */
    streamId: string;
    /**
     * @hidden
     */
    constructor(target: Session, type: string, connection: Connection, streamId: string);
    /**
     * @hidden
     */
    callDefaultBehavior(): void;
}
