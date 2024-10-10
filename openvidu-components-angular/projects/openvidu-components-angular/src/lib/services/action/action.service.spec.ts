import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { ActionService } from './action.service';
import { TranslateService } from '../translate/translate.service';
import { TranslateServiceMock } from '../translate/translate.service.mock';

export class MatDialogMock {
	open() {
		return { close: () => {} } as MatDialogRef<any>;
	}
}

describe('ActionService', () => {
	let service: ActionService;
	let dialog: MatDialog;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [MatSnackBarModule],
			providers: [
				{ provide: MatDialog, useClass: MatDialogMock },
				{ provide: TranslateService, useClass: TranslateServiceMock },
				{ provide: 'OPENVIDU_COMPONENTS_CONFIG', useValue: { production: false } }
			]
		});

		service = TestBed.inject(ActionService);
		dialog = TestBed.inject(MatDialog);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});

	it('should open connection dialog', fakeAsync(() => {
		const dialogSpy = spyOn(dialog, 'open').and.callThrough();
		service.openConnectionDialog('Test Title', 'Test Description', false);
		expect(dialogSpy).toHaveBeenCalled();
		expect(service['isConnectionDialogOpen']).toBeTrue();
	}));

	it('should not open connection dialog if one is already open', () => {
		service['isConnectionDialogOpen'] = true;
		const dialogSpy = spyOn(dialog, 'open').and.callThrough();
		service.openConnectionDialog('Test Title', 'Test Description', false);

		expect(dialogSpy).not.toHaveBeenCalled();
	});

	it('should close connection dialog and reset state', fakeAsync(() => {
		service.openConnectionDialog('Test Title', 'Test Description', false);

		tick(2000);

		expect(service['isConnectionDialogOpen']).toBeTrue();

		service.closeConnectionDialog();

		expect(service['isConnectionDialogOpen']).toBeFalse();
	}));

	it('should open connection dialog only once', fakeAsync(() => {
		// Spy on the dialog open method
		const dialogSpy = spyOn(dialog, 'open').and.callThrough();

		service.openConnectionDialog('Test Title', 'Test Description', false);
		// Verify that the dialog has been called only once
		expect(dialogSpy).toHaveBeenCalledTimes(1);
		expect(service['isConnectionDialogOpen']).toBeTrue();

		// Try to open the dialog again
		service.openConnectionDialog('Test Title', 'Test Description', false);
		service.openConnectionDialog('Test Title', 'Test Description', false);
		service.openConnectionDialog('Test Title', 'Test Description', false);

		// Verify that the dialog has been called only once
		expect(dialogSpy).toHaveBeenCalledTimes(1);
	}));
});
