import { OpenviduWebComponentModule } from './openvidu-webcomponent.module';
import { enableProdMode } from "@angular/core";
import { platformBrowserDynamic } from "@angular/platform-browser-dynamic";
import { environment } from "../../environments/environment";

  if (environment.production) {
    enableProdMode();
  }

  const bootstrap = () => platformBrowserDynamic().bootstrapModule(OpenviduWebComponentModule);
  bootstrap().catch(err => console.error(err));