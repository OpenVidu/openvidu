/**
 * See [[Session.capabilities]]
 */
export interface Capabilities {
    /**
     * `true` if the client can call [[Session.forceDisconnect]], `false` if not
     */
    forceDisconnect: boolean;
    /**
     * `true` if the client can call [[Session.forceUnpublish]], `false` if not
     */
    forceUnpublish: boolean;
    /**
     * `true` if the client can call [[Session.publish]], `false` if not
     */
    publish: boolean;
    /**
     * `true` if the client can call [[Session.subscribe]], `false` if not (true for every user for now)
     */
    subscribe: boolean;
}
