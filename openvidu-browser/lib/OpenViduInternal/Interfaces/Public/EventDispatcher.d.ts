import { Event as Event } from '../../Events/Event';
export interface EventDispatcher {
    /**
     * Adds function `handler` to handle event `type`
     */
    on(type: string, handler: (event: Event) => void): EventDispatcher;
    /**
     * Adds function `handler` to handle event `type` just once. The handler will be automatically removed after first execution
     */
    once(type: string, handler: (event: Event) => void): any;
    /**
     * Removes a `handler` from event `type`. If no handler is provided, all handlers will be removed from the event
     */
    off(type: string, handler?: (event: Event) => void): any;
}
