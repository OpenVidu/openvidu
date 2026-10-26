import { inject, Service } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

export const TOAST_DURATION_MS = 3_000;

/** Short confirmations ("Copied", "Saved") as a snackbar in a polite live region, one at a time. */
@Service()
export class ToastService {
	private readonly snackBar = inject(MatSnackBar);

	show(message: string): void {
		this.snackBar.open(message, undefined, { duration: TOAST_DURATION_MS, politeness: 'polite' });
	}
}
