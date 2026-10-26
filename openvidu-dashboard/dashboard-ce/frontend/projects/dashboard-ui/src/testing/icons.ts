import type { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { MatIcon } from '@angular/material/icon';

/** `svgIcon` of every `mat-icon` under `debug`, in document order. */
export function iconNames(debug: DebugElement): string[] {
	return debug.queryAll(By.directive(MatIcon)).map((icon) => (icon.componentInstance as MatIcon).svgIcon);
}
