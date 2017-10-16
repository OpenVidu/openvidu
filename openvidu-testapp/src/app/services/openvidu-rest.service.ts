import { Injectable } from '@angular/core';
import {
  OpenVidu as OpenViduAPI,
  Session as SessionAPI,
  TokenOptions as TokenOptionsAPI,
  OpenViduRole as OpenViduRoleAPI
} from 'openvidu-node-client';
import { environment } from '../../environments/environment';

@Injectable()
export class OpenviduRestService {

  sessionIdSession: Map<string, SessionAPI> = new Map();
  sessionIdTokenOpenViduRole: Map<string, Map<string, OpenViduRoleAPI>> = new Map();

  constructor() { }

  getSessionId(openviduURL: string, openviduSecret: string): Promise<string> {
    const OV = new OpenViduAPI(openviduURL, openviduSecret);
    const session = OV.createSession();

    return new Promise(resolve => {
      session.getSessionId((sessionId) => {
        this.sessionIdSession.set(sessionId, session);
        this.sessionIdTokenOpenViduRole.set(sessionId, new Map());
        resolve(sessionId);
      });
    });
  }

  getToken(openviduURL: string, openviduSecret: string, sessionId: string, role: string, serverData: string): Promise<string> {
    const session: SessionAPI = this.sessionIdSession.get(sessionId);
    const OVRole: OpenViduRoleAPI = OpenViduRoleAPI[role];

    return new Promise(resolve => {
      const tokenOptions: TokenOptionsAPI = new TokenOptionsAPI.Builder()
        .role(OVRole)
        .data(serverData)
        .build();
      session.generateToken(tokenOptions, (token) => {
        this.sessionIdTokenOpenViduRole.get(sessionId).set(token, OVRole);
        resolve(token);
      });
    });
  }

  getAvailableParams(): Map<string, string[]> {
    const params = new Map<string, string[]>();
    this.sessionIdSession.forEach((sessionApi, sessionId, map) => {
      params.set(sessionId, Array.from(this.sessionIdTokenOpenViduRole.get(sessionId).keys()));
    });
    return params;
  }

}
