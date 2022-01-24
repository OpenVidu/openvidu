import { BrowserModule } from "@angular/platform-browser";
import { DoBootstrap, Injector, NgModule } from "@angular/core";
import { APP_BASE_HREF, CommonModule } from "@angular/common";
import { createCustomElement, NgElement, WithProperties } from "@angular/elements";
import { OpenviduWebComponentComponent } from "./openvidu-webcomponent.component";

import { OpenviduAngularModule, VideoconferenceComponent } from "openvidu-angular";
import { environment } from '../../environments/environment';


declare global {
	interface HTMLElementTagNameMap {
	  'openvidu-webcomponent': NgElement & WithProperties<{ openviduServerUrl: string, openviduSecret: string}>;
	}
  }

@NgModule({
	declarations: [OpenviduWebComponentComponent],
	imports: [
		CommonModule,
		BrowserModule,
		OpenviduAngularModule.forRoot(environment),
	],
	// exports: [OpenviduWebComponentComponent],
	providers: [{provide: APP_BASE_HREF, useValue: '/'} , VideoconferenceComponent],
})
export class OpenviduWebComponentModule implements DoBootstrap {
	constructor(private injector: Injector) {}

	ngDoBootstrap(): void {
		const element = createCustomElement(OpenviduWebComponentComponent, {
			injector: this.injector,
		});

		customElements.define("openvidu-webcomponent", element);
	}
}
