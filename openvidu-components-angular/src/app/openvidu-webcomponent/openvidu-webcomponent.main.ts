import { OpenviduWebComponentModule } from './openvidu-webcomponent.module';
import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { environment } from '../../environments/environment';
import 'zone.js';

if (environment.production) {
	enableProdMode();
}

/**
 *
 * @internal
 */
platformBrowserDynamic()
	.bootstrapModule(OpenviduWebComponentModule, {
		ngZone: 'zone.js' // Especificar explícitamente la zona
	})
	.catch((err) => console.error('Error bootstrapping webcomponent:', err));
