export enum RecordingMode {
    ALWAYS = 'ALWAYS',  // The session is recorded automatically (as soon as there are clients publishing streams to the session)
    MANUAL = 'MANUAL'   // The session is not recorded automatically. To record the session, you can call the OpenVidu.startRecording() method
}
