import { BrowserModule } from '@angular/platform-browser';
import { DoBootstrap, Injector, NgModule } from '@angular/core';
import { APP_BASE_HREF, CommonModule } from '@angular/common';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { OpenviduWebComponentComponent } from './openvidu-webcomponent.component';

import { OpenViduAngularModule, VideoconferenceComponent } from 'openvidu-angular';
import { environment } from '../../environments/environment';

import { createCustomElement } from '@angular/elements';

@NgModule({
	declarations: [OpenviduWebComponentComponent],
	imports: [CommonModule, BrowserModule, BrowserAnimationsModule, OpenViduAngularModule.forRoot(environment)],
	// exports: [OpenviduWebComponentComponent],
	providers: [{ provide: APP_BASE_HREF, useValue: '/' }, VideoconferenceComponent],
})
export class OpenviduWebComponentModule implements DoBootstrap {
	constructor(private injector: Injector) {}

	ngDoBootstrap(): void {
		const element = createCustomElement(OpenviduWebComponentComponent, {
			injector: this.injector,
		});

		customElements.define('openvidu-webcomponent', element);
	}
}
