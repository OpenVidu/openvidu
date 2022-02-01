import { Inject, Injectable, Type } from '@angular/core';
import { LayoutComponent } from '../../components/layout/layout.component';
import { ChatPanelComponent } from '../../components/panel/chat-panel/chat-panel.component';
import { PanelComponent } from '../../components/panel/panel.component';
import { ParticipantsPanelComponent } from '../../components/panel/participants-panel/participants-panel/participants-panel.component';
import { StreamComponent } from '../../components/stream/stream.component';
import { ToolbarComponent } from '../../components/toolbar/toolbar.component';
import { LibConfig, LibraryComponents } from '../../config/lib.config';

// import { version } from '../../../../package.json';

@Injectable()
export class LibraryConfigService {

	private configuration: LibConfig;

	constructor(@Inject('LIB_CONFIG') config: LibConfig) {
		this.configuration = config;
		console.log(this.configuration);
		if(this.isProduction()) console.log('Production Mode');
		// console.log(version)
	}

	getConfig(): LibConfig {
		return this.configuration;
	}
	isProduction(): boolean {
		return this.configuration?.environment?.production;
	}

	getDynamicComponent(name: LibraryComponents) {
		let component: Type<any>;

		switch (name) {
			case LibraryComponents.LAYOUT:
				component = LayoutComponent;
				if (this.isCustomComponentDefined(LibraryComponents.LAYOUT)) {
					component = this.getCustomComponent(LibraryComponents.LAYOUT);
				}
				return component;

			case LibraryComponents.TOOLBAR:

				component = ToolbarComponent;
				if (this.isCustomComponentDefined(LibraryComponents.TOOLBAR)) {
					component = this.getCustomComponent(LibraryComponents.TOOLBAR);
				}
				return component;

			case LibraryComponents.PANEL:

				component = PanelComponent;
				// Full custom panel
				// if (this.isCustomComponentDefined(LibraryComponents.PANEL)) {
				// 	component = this.getCustomComponent(LibraryComponents.PANEL);
				// }
				return component;

			case LibraryComponents.CHAT_PANEL:

				component = ChatPanelComponent;
				if (this.isCustomComponentDefined(LibraryComponents.CHAT_PANEL)) {
					component = this.getCustomComponent(LibraryComponents.CHAT_PANEL);
				}
				return component;

			case LibraryComponents.PARTICIPANTS_PANEL:
				component = ParticipantsPanelComponent;
				if (this.isCustomComponentDefined(LibraryComponents.PARTICIPANTS_PANEL)) {
					component = this.getCustomComponent(LibraryComponents.PARTICIPANTS_PANEL);
				}
				return component;

			case LibraryComponents.STREAM:
				component = StreamComponent;
				if (this.isCustomComponentDefined(LibraryComponents.STREAM)) {
					component = this.getCustomComponent(LibraryComponents.STREAM);
				}
				return component;
		}

	}

	isCustomComponentDefined(component: string): boolean {
		return !!this.configuration?.environment?.customComponents && !!this.configuration.environment.customComponents[component];
	}

	getCustomComponent(component: string){
		return this.configuration.environment.customComponents[component];
	}
}
