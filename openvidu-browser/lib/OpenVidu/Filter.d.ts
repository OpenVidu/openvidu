import { Stream } from './Stream';
import { FilterEvent } from '../OpenViduInternal/Events/FilterEvent';
import { ObjMap } from '../OpenViduInternal/Interfaces/Private/ObjMap';
/**
 * **WARNING**: experimental option. This interface may change in the near future
 *
 * Video/audio filter applied to a Stream. See [[Stream.applyFilter]]
 */
export declare class Filter {
    /**
     * Type of filter applied. This is the name of the remote class identifying the filter to apply in Kurento Media Server.
     * For example: `"FaceOverlayFilter"`, `"GStreamerFilter"`.
     *
     * You can get this property in `*.kmd.json` files defining the Kurento filters. For example, for GStreamerFilter that's
     * [here](https://github.com/Kurento/kms-filters/blob/53a452fac71d61795952e3d2202156c6b00f6d65/src/server/interface/filters.GStreamerFilter.kmd.json#L4)
     */
    type: string;
    /**
     * Parameters used to initialize the filter.
     * These correspond to the constructor parameters used in the filter in Kurento Media Server (except for `mediaPipeline` parameter, which is never needed).
     *
     * For example: for `filter.type = "GStreamerFilter"` could be `filter.options = {"command": "videobalance saturation=0.0"}`
     *
     * You can get this property in `*.kmd.json` files defining the Kurento filters. For example, for GStreamerFilter that's
     * [here](https://github.com/Kurento/kms-filters/blob/53a452fac71d61795952e3d2202156c6b00f6d65/src/server/interface/filters.GStreamerFilter.kmd.json#L13-L31)
     */
    options: Object;
    /**
     * Value passed the last time [[Filter.execMethod]] was called. If `undefined` this method has not been called yet.
     *
     * You can use this value to know the current status of any applied filter
     */
    lastExecMethod?: {
        method: string;
        params: Object;
    };
    /**
     * @hidden
     */
    handlers: ObjMap<(event: FilterEvent) => void>;
    /**
     * @hidden
     */
    stream: Stream;
    /**
     * @hidden
     */
    constructor(type: string, options: Object);
    /**
     * Executes a filter method. Available methods are specific for each filter
     *
     * @param method Name of the method
     * @param params Parameters of the method
     */
    execMethod(method: string, params: Object): Promise<any>;
    /**
     * Subscribe to certain filter event. Available events are specific for each filter
     *
     * @param eventType Event to which subscribe to.
     * @param handler Function to execute upon event dispatched. It receives as parameter a [[FilterEvent]] object
     *
     * @returns A Promise (to which you can optionally subscribe to) that is resolved if the event listener was successfully attached to the filter and rejected with an Error object if not
     */
    addEventListener(eventType: string, handler: (event: FilterEvent) => void): Promise<any>;
    /**
     * Removes certain filter event listener previously set.
     *
     * @param eventType Event to unsubscribe from.
     *
     * @returns A Promise (to which you can optionally subscribe to) that is resolved if the event listener was successfully removed from the filter and rejected with an Error object in other case
     */
    removeEventListener(eventType: string): Promise<any>;
}
