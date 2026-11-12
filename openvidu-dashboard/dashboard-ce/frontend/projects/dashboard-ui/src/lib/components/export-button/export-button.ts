import { HttpErrorResponse } from '@angular/common/http';
import { booleanAttribute, Component, DOCUMENT, inject, input, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { LIST_EXPORT_MAX_ROWS } from '@openvidu-dashboard/typings';

import { ApiRequestError, toApiRequestError } from '../../core/http/api-error.js';
import { type Download, saveDownload } from '../../core/http/http.js';
import { ToastService } from '../../core/ui/toast.js';
import { errorMessage } from '../feedback/error-banner.js';

/** Toast of an export the row cap cut. */
export const EXPORT_TRUNCATED_MESSAGE = `Exported the first ${LIST_EXPORT_MAX_ROWS.toLocaleString('en-US')} rows. Narrow the range or the filters to export the rest.`;

/** Toast of a failed export: the error message and, when the server gave one, the request id. */
export function exportFailedMessage(error: unknown): string {
	// A file built in the browser fails with its own message, which says more than the generic one of a request.
	if (error instanceof Error && !(error instanceof ApiRequestError) && !(error instanceof HttpErrorResponse)) {
		return `Export failed: ${error.message}`;
	}

	const requestId = toApiRequestError(error).requestId;

	return `Export failed: ${errorMessage(error)}${requestId === undefined ? '' : ` Request ${requestId}`}`;
}

/**
 * "Export CSV" of a table: downloads the file `run` fetches and saves it under the server's file name, disabled while
 * it runs; a cut file and a failure are toasted.
 */
@Component({
	selector: 'ovd-export-button',
	imports: [MatButton, MatIcon],
	template: `
		<button matButton type="button" [disabled]="disabled() || running()" (click)="export()">
			<mat-icon svgIcon="download" />
			Export CSV
		</button>
	`
})
export class ExportButton {
	private readonly toast = inject(ToastService);
	private readonly document = inject(DOCUMENT);

	readonly run = input.required<() => Promise<Download>>();
	readonly disabled = input(false, { transform: booleanAttribute });
	/** File name when the server gives none. */
	readonly fallbackName = input('export.csv');

	protected readonly running = signal(false);

	protected async export(): Promise<void> {
		this.running.set(true);

		try {
			const download = await this.run()();

			saveDownload(this.document, download, this.fallbackName());

			if (download.truncated) {
				this.toast.show(EXPORT_TRUNCATED_MESSAGE);
			}
		} catch (error) {
			this.toast.show(exportFailedMessage(error));
		} finally {
			this.running.set(false);
		}
	}
}
