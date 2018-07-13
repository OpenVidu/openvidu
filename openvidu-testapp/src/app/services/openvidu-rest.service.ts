import { Injectable } from '@angular/core';
import {
  OpenVidu as OpenViduAPI,
  Session as SessionAPI,
  OpenViduRole as OpenViduRoleAPI,
  SessionProperties as SessionPropertiesAPI
} from 'openvidu-node-client';

@Injectable()
export class OpenviduRestService {

  sessionIdSession: Map<string, SessionAPI> = new Map();
  sessionIdTokenOpenViduRole: Map<string, Map<string, OpenViduRoleAPI>> = new Map();

  constructor() { }

  getSessionId(openviduURL: string, openviduSecret: string, sessionProperties: SessionPropertiesAPI): Promise<string> {
    return new Promise((resolve, reject) => {
      const OV = new OpenViduAPI(openviduURL, openviduSecret);
      OV.createSession(sessionProperties)
        .then(session => {
          this.sessionIdSession.set(session.getSessionId(), session);
          this.sessionIdTokenOpenViduRole.set(session.getSessionId(), new Map());
          resolve(session.getSessionId());
        })
        .catch(error => {
          reject(error);
        });
    });
  }

  getToken(openviduURL: string, openviduSecret: string, sessionId: string, role: string, serverData: string): Promise<string> {
    const session: SessionAPI = this.sessionIdSession.get(sessionId);
    const OVRole: OpenViduRoleAPI = OpenViduRoleAPI[role];

    return new Promise((resolve, reject) => {
      session.generateToken({
        role: OVRole,
        data: serverData
      })
        .then(token => {
          this.sessionIdTokenOpenViduRole.get(sessionId).set(token, OVRole);
          resolve(token);
        }).catch(error => {
          reject(error);
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
