import { Session } from "./Session";
export declare class OpenVidu {
    private urlOpenViduServer;
    private secret;
    constructor(urlOpenViduServer: string, secret: string);
    createSession(): Session;
}
