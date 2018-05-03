export declare enum OpenViduRole {
    /**
     * Can subscribe to published streams of other users
     */
    SUBSCRIBER = "SUBSCRIBER",
    /**
     * SUBSCRIBER permissions + can publish their own streams
     */
    PUBLISHER = "PUBLISHER",
    /**
     * _(not available yet)_ SUBSCRIBER + PUBLIHSER permissions + can force `unpublish()` and `disconnect()` over a third-party stream or user
     */
    MODERATOR = "MODERATOR",
}
