/**
 * See [[OpenVidu.getDevices]]
 */
export interface Device {
    /**
     * `"videoinput"`, `"audioinput"`
     */
    kind: string;
    /**
     * Unique ID for the device. Use it on `audioSource` or `videoSource` properties of [[PublisherProperties]]
     */
    deviceId: string;
    /**
     * Description of the device. An empty string if the user hasn't granted permissions to the site to access the device
     */
    label: string;
}
