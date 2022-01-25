import { Component, Input, OnInit } from '@angular/core';

export interface SessionConfig {
	sessionName: string;
	userName: string;
	tokens: { webcam: string; screen: string };
}

@Component({
	template: `<ov-videoconference
		*ngIf="successParams"
		[sessionName]="_sessionConfig.sessionName"
		[userName]="_sessionConfig.userName"
		[openviduServerUrl]="openviduServerUrl"
		[openviduSecret]="openviduSecret"
		[tokens]="_sessionConfig.tokens"
	></ov-videoconference>`
})
export class OpenviduWebComponentComponent implements OnInit {
	@Input() openviduServerUrl: string;
	@Input() openviduSecret: string;
	_sessionConfig: SessionConfig;

	successParams: boolean = false;

	constructor() {}

	ngOnInit(): void {}

	@Input('sessionConfig')
	set sessionConfig(config: SessionConfig | string) {
		console.log('Webcomponent sessionConfig: ', config);
		if (typeof config === 'string') {
			try {
				console.log('STRING')
				config = JSON.parse(config);
			} catch (error) {
				console.error('Unexpected JSON', error);
				throw 'Unexpected JSON';
			}
		}

		if (this.isEmpty(<SessionConfig>config)) {
			// Leaving session when sessionConfig is empty
		} else {
			console.log("URL",this.openviduServerUrl);
			console.log('SECRET',this.openviduSecret);
			this.successParams = this.isCorrectParams(<SessionConfig>config);
			this._sessionConfig = <SessionConfig>config;
			if (!this.successParams) {
				console.error('Parameters received are incorrect: ', config);
				console.error('Session cannot start');
			}
		}
	}

	private isCorrectParams(config: SessionConfig): boolean {

		console.log(config)
		const canGenerateToken = !!config.sessionName && !!config.userName && !!this.openviduServerUrl && !!this.openviduSecret;
		const hasToken = !!config.tokens?.webcam && !!config.tokens?.screen && !!config.userName;

		return canGenerateToken || hasToken;
	}

	private isEmpty(config: SessionConfig): boolean {
		return Object.keys(config).length === 0;
	}
}
