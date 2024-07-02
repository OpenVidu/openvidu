import { Injectable } from '@angular/core';

export interface LivekitParams {
  livekitUrl: string;
  livekitApiKey: string;
  livekitApiSecret: string;
}

@Injectable({
  providedIn: 'root'
})
export class LivekitParamsService {

  private params: LivekitParams = {
    livekitUrl: `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${location.hostname}:7880/`,
    livekitApiKey: 'devkey',
    livekitApiSecret: 'secret'
  };

  constructor() { }

  getParams() {
    return this.params;
  }

  updateParams(params: LivekitParams) {
    this.params = params;
  }

}
