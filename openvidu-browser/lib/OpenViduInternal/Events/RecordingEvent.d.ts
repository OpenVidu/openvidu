import { Event } from './Event';
import { Session } from '../../OpenVidu/Session';
/**
 * Defines the following events:
 * - `recordingStarted`: dispatched by [[Session]]
 * - `recordingStopped`: dispatched by [[Session]]
 */
export declare class RecordingEvent extends Event {
    /**
     * The recording ID generated in openvidu-server
     */
    id: string;
    /**
     * The recording name you supplied to openvidu-server. For example, to name your recording file MY_RECORDING:
     * - With **API REST**: POST to `/api/recordings/start` passing JSON body `{"session":"sessionId","name":"MY_RECORDING"}`
     * - With **openvidu-java-client**: `OpenVidu.startRecording(sessionId, "MY_RECORDING")` or `OpenVidu.startRecording(sessionId, new RecordingProperties.Builder().name("MY_RECORDING").build())`
     * - With **openvidu-node-client**: `OpenVidu.startRecording(sessionId, "MY_RECORDING")` or `OpenVidu.startRecording(sessionId, {name: "MY_RECORDING"})`
     *
     * If no name is supplied, this property will be undefined and the recorded file will be named after property [[id]]
     */
    name?: string;
    /**
     * @hidden
     */
    constructor(target: Session, type: string, id: string, name: string);
    /**
     * @hidden
     */
    callDefaultBehavior(): void;
}
