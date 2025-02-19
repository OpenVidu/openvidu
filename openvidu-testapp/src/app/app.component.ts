import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { LogLevel, setLogLevel } from 'livekit-client';
import { LivekitParamsService } from './services/livekit-params.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
    standalone: false
})
export class AppComponent {
  livekitUrl = 'ws://localhost:7880/'; // `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://localhost:1880/`;
  livekitApiKey = 'devkey';
  livekitApiSecret = 'secret';

  constructor(
    private router: Router,
    private livekitParamsService: LivekitParamsService
  ) {}

  async ngOnInit() {
    // LiveKit client logging. Change here to build with verbose logging.
    // Levels: trace, debug, info (default), warn, error, silent.
    setLogLevel(LogLevel.debug);

    await this.updateParams();
    console.log('LiveKit credentials updated');
  }

  updateUrl(url: any) {
    this.livekitUrl = url;
    this.updateParams();
  }

  updateApiKey(apiKey: any) {
    this.livekitApiKey = apiKey;
    this.updateParams();
  }

  updateApiSecret(apiSecret: any) {
    this.livekitApiSecret = apiSecret;
    this.updateParams();
  }

  async updateParams() {
    let myUrl = this.livekitUrl;
    if (!(myUrl.substring(myUrl.length - 1) === '/')) {
      myUrl += '/';
    }
    await this.livekitParamsService.updateParams({
      livekitUrl: myUrl,
      livekitApiKey: this.livekitApiKey,
      livekitApiSecret: this.livekitApiSecret,
    });
  }
}
