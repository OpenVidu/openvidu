/**
 * See [[TokenOptions.role]]
 */
export declare enum OpenViduRole {
    /**
     * Can subscribe to published Streams of other users
     */
    SUBSCRIBER = "SUBSCRIBER",
    /**
     * SUBSCRIBER permissions + can publish their own Streams (call `Session.publish()`)
     */
    PUBLISHER = "PUBLISHER",
    /**
     * SUBSCRIBER + PUBLISHER permissions + can force the unpublishing or disconnection over a third-party Stream or Connection
     * (call `Session.forceUnpublish()` and `Session.forceDisconnect()`)
     */
    MODERATOR = "MODERATOR"
}
