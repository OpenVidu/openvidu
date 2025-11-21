/**
 * The ***ovPreJoin** directive empowers you to substitute the default pre-join component template with a custom one.
 * This directive allows you to create a completely custom pre-join experience while maintaining the core functionality.
 *
 * In the example below, we demonstrate how to replace the pre-join template with a custom one that includes
 * device selection and a custom join button.
 *
 * <!--ovPreJoin-start-tutorial-->
 * ```typescript
 * import { HttpClient } from '@angular/common/http';
 * import { Component } from '@angular/core';
 * import { lastValueFrom } from 'rxjs';
 * import { FormsModule } from '@angular/forms';
 *
 * import {
 * 	DeviceService,
 * 	ParticipantService,
 * 	OpenViduComponentsModule,
 * } from 'openvidu-components-angular';
 *
 * @Component({
 * 	selector: 'app-root',
 * 	template: `
 * 		<ov-videoconference
 * 			[token]="token"
 * 			[livekitUrl]="LIVEKIT_URL"
 * 			(onTokenRequested)="onTokenRequested($event)"
 * 			(onReadyToJoin)="onReadyToJoin()"
 * 		>
 * 			<!-- Custom Pre-Join Component -->
 * 			<div *ovPreJoin class="custom-prejoin">
 * 				<h2>Join Meeting</h2>
 * 				<div class="prejoin-form">
 * 					<input
 * 						type="text"
 * 						placeholder="Enter your name"
 * 						[(ngModel)]="participantName"
 * 						class="name-input"
 * 					/>
 * 					<button
 * 						(click)="joinMeeting()"
 * 						[disabled]="!participantName"
 * 						class="join-button"
 * 					>
 * 						Join Meeting
 * 					</button>
 * 				</div>
 * 			</div>
 * 		</ov-videoconference>
 * 	`,
 * 	styles: `
 * 		.custom-prejoin {
 * 			display: flex;
 * 			flex-direction: column;
 * 			align-items: center;
 * 			justify-content: center;
 * 			height: 100vh;
 * 			background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
 * 			color: white;
 * 		}
 * 		.prejoin-form {
 * 			display: flex;
 * 			flex-direction: column;
 * 			gap: 20px;
 * 			align-items: center;
 * 		}
 * 		.name-input {
 * 			padding: 12px;
 * 			border: none;
 * 			border-radius: 8px;
 * 			font-size: 16px;
 * 			min-width: 250px;
 * 		}
 * 		.join-button {
 * 			padding: 12px 24px;
 * 			background: #4CAF50;
 * 			color: white;
 * 			border: none;
 * 			border-radius: 8px;
 * 			font-size: 16px;
 * 			cursor: pointer;
 * 			transition: background 0.3s;
 * 		}
 * 		.join-button:hover:not(:disabled) {
 * 			background: #45a049;
 * 		}
 * 		.join-button:disabled {
 * 			background: #cccccc;
 * 			cursor: not-allowed;
 * 		}
 * 	`,
 * 	standalone: true,
 * 	imports: [OpenViduComponentsModule, FormsModule],
 * })
 * export class AppComponent {
 * 	// For local development, leave these variables empty
 * 	// For production, configure them with correct URLs depending on your deployment
 * 	APPLICATION_SERVER_URL = '';
 * 	LIVEKIT_URL = '';
 *
 * 	// Define the name of the room and initialize the token variable
 * 	roomName = 'custom-prejoin';
 * 	token!: string;
 * 	participantName: string = '';
 *
 * 	constructor(
 * 		private httpClient: HttpClient,
 * 		private deviceService: DeviceService,
 * 		private participantService: ParticipantService
 * 	) {
 * 		this.configureUrls();
 * 	}
 *
 * 	private configureUrls() {
 * 		// If APPLICATION_SERVER_URL is not configured, use default value from local development
 * 		if (!this.APPLICATION_SERVER_URL) {
 * 			if (window.location.hostname === 'localhost') {
 * 				this.APPLICATION_SERVER_URL = 'http://localhost:6080/';
 * 			} else {
 * 				this.APPLICATION_SERVER_URL =
 * 					'https://' + window.location.hostname + ':6443/';
 * 			}
 * 		}
 *
 * 		// If LIVEKIT_URL is not configured, use default value from local development
 * 		if (!this.LIVEKIT_URL) {
 * 			if (window.location.hostname === 'localhost') {
 * 				this.LIVEKIT_URL = 'ws://localhost:7880/';
 * 			} else {
 * 				this.LIVEKIT_URL = 'wss://' + window.location.hostname + ':7443/';
 * 			}
 * 		}
 * 	}
 *
 * 	// Function to request a token when a participant joins the room
 * 	async onTokenRequested(participantName: string) {
 * 		const { token } = await this.getToken(this.roomName, participantName);
 * 		this.token = token;
 * 	}
 *
 * 	// Function called when ready to join
 * 	onReadyToJoin() {
 * 		console.log('Ready to join the meeting');
 * 	}
 *
 * 	// Function to join the meeting
 * 	async joinMeeting() {
 * 		if (this.participantName.trim()) {
 * 			// Request token with the participant name
 * 			await this.onTokenRequested(this.participantName);
 * 		}
 * 	}
 *
 * 	// Function to get a token from the server
 * 	getToken(roomName: string, participantName: string): Promise<any> {
 * 		try {
 * 			// Send a POST request to the server to obtain a token
 * 			return lastValueFrom(
 * 				this.httpClient.post<any>(this.APPLICATION_SERVER_URL + 'token', {
 * 					roomName,
 * 					participantName,
 * 				})
 * 			);
 * 		} catch (error: any) {
 * 			// Handle errors, e.g., if the server is not reachable
 * 			if (error.status === 404) {
 * 				throw {
 * 					status: error.status,
 * 					message:
 * 						'Cannot connect with the backend. ' + error.url + ' not found',
 * 				};
 * 			}
 * 			throw error;
 * 		}
 * 	}
 * }
 *
 * ```
 * <!--ovPreJoin-end-tutorial-->
 *
 * @internal
 */

import { Directive, TemplateRef, ViewContainerRef } from '@angular/core';

@Directive({
	selector: '[ovPreJoin]',
	standalone: false
})
export class PreJoinDirective {
	constructor(
		public template: TemplateRef<any>,
		public container: ViewContainerRef
	) {}
}

/**
 * The ***ovParticipantPanelAfterLocalParticipant** directive allows you to inject custom HTML or Angular templates
 * immediately after the local participant item in the participant panel.
 * This enables you to extend the participant panel with additional controls, information, or UI elements.
 *
 * Usage example:
 * ```html
 * <ov-participant-panel>
 *   <ng-container *ovParticipantPanelAfterLocalParticipant>
 *     <div class="custom-content">
 *       <!-- Your custom HTML here -->
 *       <span>Custom content after local participant</span>
 *     </div>
 *   </ng-container>
 * </ov-participant-panel>
 * ```
 */
@Directive({
	selector: '[ovParticipantPanelAfterLocalParticipant]',
	standalone: false
})
export class ParticipantPanelAfterLocalParticipantDirective {
	constructor(
		public template: TemplateRef<any>,
		public container: ViewContainerRef
	) {}
}

/**
 * The ***ovLeaveButton** directive allows you to inject a custom leave button template. You can use the toolbarLeaveButton = false for
 * replacing the default leave button with your custom one.
 *
 * Usage example:
 * ```html
 * <ov-videoconference [toolbarLeaveButton]="false">
 *   <ng-container *ovLeaveButton>
 *     <button class="my-leave-button" (click)="customLeave()">
 *       Leave meeting
 *     </button>
 *   </ng-container>
 * </ov-videoconference>
 * ```
 */
@Directive({
	selector: '[ovToolbarLeaveButton]',
	standalone: false
})
export class LeaveButtonDirective {
	constructor(
		public template: TemplateRef<any>,
		public container: ViewContainerRef
	) {}
}

/**
 * The ***ovLayoutAdditionalElements** directive allows you to inject custom HTML or Angular templates
 * as additional layout elements within the videoconference UI.
 * This enables you to extend the layout with extra controls, banners, or any custom UI.
 *
 * Usage example:
 * ```html
 * <ov-videoconference>
 *   <ng-container *ovLayoutAdditionalElements>
 *     <div class="my-custom-layout-element">
 *       <!-- Your custom HTML here -->
 *       <span>Extra layout element</span>
 *     </div>
 *   </ng-container>
 * </ov-videoconference>
 * ```
 */
@Directive({
	selector: '[ovLayoutAdditionalElements]',
	standalone: false
})
export class LayoutAdditionalElementsDirective {
	constructor(
		public template: TemplateRef<any>,
		public container: ViewContainerRef
	) {}
}

/**
 * The ***ovParticipantPanelParticipantBadge** directive allows you to inject custom badges or indicators
 * in the participant panel.
 * This enables you to add role indicators, status badges, or other visual elements.
 *
 * Usage example:
 * ```html
 * <ov-participants-panel>
 *   <div *ovParticipantPanelItem="let participant">
 *     <ov-participant-panel-item [participant]="participant">
 *       <!-- Custom badge for local participant only -->
 *       <ng-container *ovParticipantPanelParticipantBadge>
 *         <span class="moderator-badge">
 *           <mat-icon>admin_panel_settings</mat-icon>
 *           Moderator
 *         </span>
 *       </ng-container>
 *     </ov-participant-panel-item>
 *   </div>
 * </ov-participants-panel>
 * ```
 */
@Directive({
	selector: '[ovParticipantPanelParticipantBadge]',
	standalone: false
})
export class ParticipantPanelParticipantBadgeDirective {
	constructor(
		public template: TemplateRef<any>,
		public container: ViewContainerRef
	) {}
}
