import { Session } from "./Session";
import { SessionProperties } from "./SessionProperties";

export class OpenVidu {

  constructor(private urlOpenViduServer: string, private secret: string) { }

  public createSession(properties?: SessionProperties): Session {
    return new Session(this.urlOpenViduServer, this.secret, properties);
  }

  public startArchive(sessionId: string) {
    // TODO: REST POST to start recording in OpenVidu Server
  }

  public stopArchive(sessionId: string) {
    // TODO: REST POST to end recording in OpenVidu Server
  }

}