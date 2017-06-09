import { Session } from "./Session";

export class OpenVidu {

  constructor(private urlOpenViduServer: string, private secret: string){ }

  public createSession(): Session {
      return new Session(this.urlOpenViduServer, this.secret);
  }

}