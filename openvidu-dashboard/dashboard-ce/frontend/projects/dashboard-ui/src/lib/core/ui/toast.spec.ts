import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { describe, expect, it, vi } from 'vitest';

import { TOAST_DURATION_MS, ToastService } from './toast.js';

describe('ToastService', () => {
	it('shows one snackbar for three seconds in a polite live region', () => {
		const open = vi.fn();

		TestBed.configureTestingModule({ providers: [{ provide: MatSnackBar, useValue: { open } }] });
		TestBed.inject(ToastService).show('Saved');

		expect(open).toHaveBeenCalledWith('Saved', undefined, { duration: TOAST_DURATION_MS, politeness: 'polite' });
		expect(TOAST_DURATION_MS).toBe(3_000);
	});
});
