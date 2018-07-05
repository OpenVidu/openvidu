/**
 * How the video will be inserted in the DOM for Publishers and Subscribers. See [[PublisherProperties.insertMode]] and [[SubscriberProperties.insertMode]]
 */
export declare enum VideoInsertMode {
    /**
     * Video inserted after the target element (as next sibling)
     */
    AFTER = "AFTER",
    /**
     * Video inserted as last child of the target element
     */
    APPEND = "APPEND",
    /**
     * Video inserted before the target element (as previous sibling)
     */
    BEFORE = "BEFORE",
    /**
     * Video inserted as first child of the target element
     */
    PREPEND = "PREPEND",
    /**
     * Video replaces target element
     */
    REPLACE = "REPLACE"
}
