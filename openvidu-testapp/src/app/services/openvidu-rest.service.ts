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

  constructor() { }

  getSessionId(): Promise<String> {
    const OV = new OpenViduAPI(environment.OPENVIDU_URL, environment.OPENVIDU_SECRET);
    const session = OV.createSession();

    return new Promise(resolve => {
      session.getSessionId((sessionId) => {
        resolve(sessionId);
      });
    });
  }

  getToken(): Promise<String> {
    const OV = new OpenViduAPI(environment.OPENVIDU_URL, environment.OPENVIDU_SECRET);
    const session = OV.createSession();

    return new Promise(resolve => {
      let tokenOptions: TokenOptionsAPI;
      session.generateToken((token) => {
        resolve(token);
      });
    });
  }

}
