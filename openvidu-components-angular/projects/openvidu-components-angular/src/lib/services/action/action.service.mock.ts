import { Injectable } from '@angular/core';
import { INotificationOptions } from '../../models/notification-options.model';

@Injectable()
export class ActionServiceMock {
	constructor() {}

	launchNotification(options: INotificationOptions, callback): void {

	}

	openDialog(titleMessage: string, descriptionMessage: string, allowClose = true) {

	}

	closeDialog() {
	}
}
