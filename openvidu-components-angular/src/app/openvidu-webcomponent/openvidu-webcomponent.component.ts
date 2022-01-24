import { Component, Input, OnInit } from "@angular/core";

export interface SessionConfig {
	sessionName: string;
	userName: string;
	tokens: { webcam: string; screen: string };
}

@Component({
	template: ` <ov-videoconference
		*ngIf="successParams"
		[sessionName]="sessionConfig.sessionName"
		[userName]="sessionConfig.userName"
		[openviduServerUrl]="openviduServerUrl"
		[openviduSecret]="openviduSecret"
		[tokens]="sessionConfig.tokens"
	></ov-videoconference>`,
})
export class OpenviduWebComponentComponent implements OnInit {
	@Input() openviduServerUrl: string;
	@Input() openviduSecret: string;

	successParams: boolean = false;

	constructor() {}

	ngOnInit(): void {}

	@Input("sessionConfig")
	set sessionConfig(config: SessionConfig | string) {
		console.log("Webcomponent sessionConfig: ", config);
		// setTimeout(() => {
		if (typeof config === "string") {
			try {
				config = JSON.parse(config);
			} catch (error) {
				console.error("Unexpected JSON", error);
			}
		} else {
			if (this.isEmpty(config)) {
				// Leaving session when sessionConfig is empty
			} else {
				this.successParams = this.isCorrectParams(config);
				if (!this.successParams) {
					console.error("Parameters received are incorrect: ", config);
					console.error("Session cannot start");
				}
			}
		}

		// }, 200);
	}

	private isCorrectParams(config: SessionConfig): boolean {
		const canGenerateToken =
			!!config.sessionName &&
			!!config.userName &&
			!!this.openviduServerUrl &&
			!!this.openviduSecret;
		const hasToken =
			!!config.tokens?.webcam && !!config.tokens?.screen && !!config.userName;

		return canGenerateToken || hasToken;
	}

	private isEmpty(config: SessionConfig): boolean {
		return Object.keys(config).length === 0;
	}
}
