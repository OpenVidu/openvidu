import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ActionService } from './action.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogMock } from '../../../test-helpers/action.service.mock';
import { TranslateServiceMock } from '../../../test-helpers/translate.service.mock';

describe('ActionService (characterization)', () => {
	let service: ActionService;
	let dialog: MatDialogMock;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [MatSnackBarModule],
			providers: [
				{ provide: MatDialog, useClass: MatDialogMock },
				{ provide: 'TranslateService', useClass: TranslateServiceMock },
				{ provide: 'OPENVIDU_COMPONENTS_CONFIG', useValue: { production: false } }
			]
		});

		service = TestBed.inject(ActionService);
		dialog = TestBed.inject(MatDialog) as unknown as MatDialogMock;
	});

	it('opens a connection dialog when requested', () => {
		const spy = spyOn(dialog, 'open').and.callThrough();

		service.openConnectionDialog('Title', 'Description', false);

		expect(spy).toHaveBeenCalledTimes(1);
		// observable behavior: a MatDialogRef was created (do not assert internal state)
		expect(dialog.lastRef).toBeTruthy();
		expect(typeof dialog.lastRef!.close).toBe('function');
	});

	it('does not open a new dialog if one is already open (repeated calls)', () => {
		const spy = spyOn(dialog, 'open').and.callThrough();

		service.openConnectionDialog('Title', 'Description', false);
		// repeated calls simulate concurrent/repeated user attempts
		service.openConnectionDialog('Title', 'Description', false);
		service.openConnectionDialog('Title', 'Description', false);

		// observed behavior: open called only once
		expect(spy).toHaveBeenCalledTimes(1);
	});

	it('closes the opened dialog when requested and allows opening a new one afterwards', fakeAsync(() => {
		const openSpy = spyOn(dialog, 'open').and.callThrough();

		service.openConnectionDialog('T', 'D', false);
		tick(10); // advance microtasks if the service uses timers/async internally

		// Behavior: closing should invoke close() on the MatDialogRef
		const ref = dialog.lastRef!;
		expect(ref).toBeTruthy();
		expect(ref.close).not.toHaveBeenCalled();

		service.closeConnectionDialog();
		expect(ref.close).toHaveBeenCalledTimes(1);

		// After closing, opening again should create another instance (another open call)
		service.openConnectionDialog('T', 'D', false);
		expect(openSpy).toHaveBeenCalledTimes(2);
	}));

	it('handles rapid consecutive calls by creating a single dialog (reentrancy protection)', fakeAsync(() => {
		const spy = spyOn(dialog, 'open').and.callThrough();

		// several almost-simultaneous calls
		service.openConnectionDialog('T', 'D', false);
		service.openConnectionDialog('T', 'D', false);
		tick(0);
		service.openConnectionDialog('T', 'D', false);
		tick(0);

		expect(spy).toHaveBeenCalledTimes(1);
	}));

	it('launchNotification uses snackbar and triggers callback on action', fakeAsync(() => {
		const snackBar = TestBed.inject(
			(window as any).ng && (window as any).ng.material
				? (window as any).ng.material.MatSnackBar
				: (require('@angular/material/snack-bar') as any).MatSnackBar
		) as any;
		// Fallback: inject via TestBed
		const snack = TestBed.inject(MatSnackBar);
		const openSpy = spyOn(snack, 'open').and.returnValue({ onAction: () => of(null).pipe(delay(0)) } as any);

		const callback = jasmine.createSpy('callback');
		service.launchNotification({ message: 'hello', buttonActionText: 'OK' }, callback);
		// allow the deferred observable to emit
		tick();

		expect(openSpy).toHaveBeenCalled();
		expect(callback).toHaveBeenCalled();
	}));

	it('openDeleteRecordingDialog calls success callback when dialog closes with true', fakeAsync(() => {
		const success = jasmine.createSpy('success');
		service.openDeleteRecordingDialog(success);
		// MatDialogRefMock.afterClosed returns of(true) so the subscription should call the callback
		tick();
		expect(success).toHaveBeenCalledTimes(1);
	}));

	it('openRecordingPlayerDialog triggers error handler when dialog returns manageError', fakeAsync(() => {
		// Arrange: make dialog.open return a ref that afterClosed emits an object with manageError:true
		const returnRef = {
			afterClosed: () => ({ subscribe: (fn: any) => fn({ manageError: true, error: { code: 1 } }) }),
			close: jasmine.createSpy('close')
		} as any;
		const openSpy = spyOn(dialog, 'open').and.returnValue(returnRef);
		const handleSpy = spyOn<any>(service as any, 'handleRecordingPlayerError').and.callThrough();

		// Act
		service.openRecordingPlayerDialog('someSrc', true);
		tick();

		// Assert
		expect(openSpy).toHaveBeenCalled();
		expect(handleSpy).toHaveBeenCalled();
	}));
});
