import { MatDialogRef } from '@angular/material/dialog';
import { Subject, of } from 'rxjs';
export class ActionServiceMock {
	openConnectionDialog(title?: string, description?: string, allowClose?: boolean): void {}
	closeConnectionDialog(): void {}
	openDialog(title?: string, description?: string, allowClose?: boolean): void {}
	openDeleteRecordingDialog(callback?: () => void): void {
		if (callback) callback();
	}
	openRecordingPlayerDialog(src?: string, allowClose?: boolean): void {}
	launchNotification(options?: any, callback?: () => void): void {
		if (callback) callback();
	}
}

export class MatDialogRefMock {
	private closed$ = new Subject<boolean>();
	// expose a jasmine spy for close so tests can assert it was called
	close = jasmine.createSpy('close').and.callFake(() => {
		// when close is called, emit and complete the closed observable
		this.closed$.next(true);
		this.closed$.complete();
	});

	afterClosed() {
		// return an observable that only emits when close() is called
		return this.closed$.asObservable();
	}
}

export class MatDialogMock {
	opens = 0;
	lastRef: MatDialogRefMock | null = null;

	open(component?: any) {
		this.opens++;
		// If the consumer opens the DeleteDialogComponent, return a ref that emits immediately
		// (some tests expect afterClosed to already have emitted for confirm/delete dialogs)
		if (component && component.name === 'DeleteDialogComponent') {
			const immediateRef: any = {
				close: jasmine.createSpy('close'),
				afterClosed: () => of(true)
			};
			this.lastRef = immediateRef as unknown as MatDialogRefMock;
			return immediateRef as unknown as MatDialogRef<any>;
		}

		this.lastRef = new MatDialogRefMock();
		return this.lastRef as unknown as MatDialogRef<any>;
	}
}
