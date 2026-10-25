import { Component, computed, input, output } from '@angular/core';
import { ApiRequestError, toApiRequestError } from '../core/api-error.js';
import { Notice } from './notice.js';

/** Text for an error code; the server message stays for logs. */
export function errorMessage(error: unknown): string {
	const failure = error instanceof ApiRequestError ? error : toApiRequestError(error);

	switch (failure.code) {
		case 'NETWORK_ERROR':
			return 'The server is unreachable.';
		case 'TIMEOUT':
			return 'The server took too long to answer; the data shown may be out of date.';
		case 'NOT_READY':
			return 'The server is not ready yet.';
		case 'NOT_FOUND':
			return 'Not found.';
		case 'VALIDATION_ERROR':
			return 'The request was rejected as invalid.';
		case 'RATE_LIMITED':
			return 'Too many requests; try again later.';
		default:
			return 'Something went wrong while loading the data.';
	}
}

/** The error variant of `ovd-notice`: the message for the error code, the request id and Retry. */
@Component({
	selector: 'ovd-error-banner',
	imports: [Notice],
	template: `
		<ovd-notice variant="error" actionLabel="Retry" [placement]="variant()" (action)="retry.emit()">
			<span>{{ message() ?? defaultMessage() }}</span>
			@if (requestId()) {
				<span class="request ovd-mono">Request {{ requestId() }}</span>
			}
		</ovd-notice>
	`,
	styles: `
		:host {
			display: block;
		}

		.request {
			font: var(--mat-sys-body-small);
		}
	`
})
export class ErrorBanner {
	readonly error = input<unknown>(null);
	/** Replaces the message derived from the error code. */
	readonly message = input<string>();
	readonly variant = input<'inline' | 'page'>('inline');
	readonly retry = output();

	protected readonly defaultMessage = computed(() => errorMessage(this.error()));
	protected readonly requestId = computed(() => {
		const error = this.error();

		return error === null ? undefined : toApiRequestError(error).requestId;
	});
}
