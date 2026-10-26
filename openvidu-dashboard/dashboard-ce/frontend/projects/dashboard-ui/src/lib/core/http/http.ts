import { HttpClient, type HttpContext, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { catchError, firstValueFrom, from, map, type Observable, of, switchMap, throwError, timeout } from 'rxjs';

import { ApiRequestError, toApiRequestError } from './api-error.js';

/** Relative to the document base, so the dashboard works under any path prefix. */
export const API_BASE = 'api/v1/';

/** A read that has not answered by then is cancelled, so a hung request never freezes a live view. */
export const REQUEST_TIMEOUT_MS = 30_000;

function timedOut(): Observable<never> {
	return throwError(
		() =>
			new ApiRequestError(0, 'TIMEOUT', `The server did not answer within ${String(REQUEST_TIMEOUT_MS / 1000)} s`)
	);
}

export type QueryValue = string | number | boolean | readonly string[] | null | undefined;

export interface RequestOptions {
	params?: Readonly<Record<string, QueryValue>>;
	context?: HttpContext;
	headers?: Readonly<Record<string, string>>;
}

/** Result of a conditional GET: the fresh body and its validator, or `304` when the validator still matches. */
export type ConditionalResult<T> = { status: 200; body: T; etag: string | null } | { status: 304; etag: string };

/** A downloaded file and the name of its `Content-Disposition`, when the server gives one. */
export interface Download {
	blob: Blob;
	fileName: string | null;
}

/** `filename` of a `Content-Disposition` header, quoted or not. */
export function dispositionFileName(header: string | null): string | null {
	const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(header ?? '');

	return match?.[1] === undefined ? null : decodeURIComponent(match[1]);
}

/** A failure whose body arrived as a blob, with the body parsed back to JSON so its error envelope is read. */
async function withJsonBody(error: unknown): Promise<unknown> {
	if (!(error instanceof HttpErrorResponse) || !(error.error instanceof Blob)) {
		return error;
	}

	let body: unknown;

	try {
		body = JSON.parse(await error.error.text());
	} catch {
		body = null;
	}

	return new HttpErrorResponse({
		error: body,
		headers: error.headers,
		status: error.status,
		...(error.url === null ? {} : { url: error.url })
	});
}

function toParams(params: Readonly<Record<string, QueryValue>> = {}): HttpParams {
	let result = new HttpParams();

	for (const [key, value] of Object.entries(params)) {
		if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
			continue;
		}

		result = result.set(key, Array.isArray(value) ? value.join(',') : String(value));
	}

	return result;
}

/** The only HTTP access of the UI: API paths relative to `api/v1/`, failures mapped to `ApiRequestError`. */
@Service()
export class HttpService {
	private readonly http = inject(HttpClient);

	get$<T>(path: string, options: RequestOptions = {}): Observable<T> {
		return this.http.get<T>(API_BASE + path, { params: toParams(options.params), ...this.context(options) }).pipe(
			timeout({ first: REQUEST_TIMEOUT_MS, with: timedOut }),
			catchError((error: unknown) => throwError(() => toApiRequestError(error)))
		);
	}

	get<T>(path: string, options: RequestOptions = {}): Promise<T> {
		return firstValueFrom(this.get$<T>(path, options));
	}

	/** GET with `If-None-Match: etag` when a validator is given; a `304` resolves instead of failing. */
	getConditional<T>(path: string, etag: string | null, options: RequestOptions = {}): Promise<ConditionalResult<T>> {
		const headers = { ...options.headers, ...(etag === null ? {} : { 'If-None-Match': etag }) };

		return firstValueFrom(
			this.http
				.get<T>(API_BASE + path, {
					...this.context(options),
					params: toParams(options.params),
					headers,
					observe: 'response'
				})
				.pipe(
					timeout({ first: REQUEST_TIMEOUT_MS, with: timedOut }),
					map((response): ConditionalResult<T> => ({
						status: 200,
						body: response.body as T,
						etag: response.headers.get('ETag')
					})),
					catchError((error: unknown) =>
						error instanceof HttpErrorResponse && error.status === 304 && etag !== null
							? of<ConditionalResult<T>>({ status: 304, etag: error.headers.get('ETag') ?? etag })
							: throwError(() => toApiRequestError(error))
					)
				)
		);
	}

	/** GET of a file: its body as a blob and the file name the server suggests. */
	download(path: string, options: RequestOptions = {}): Promise<Download> {
		return firstValueFrom(
			this.http
				.get(API_BASE + path, {
					...this.context(options),
					params: toParams(options.params),
					observe: 'response',
					responseType: 'blob'
				})
				.pipe(
					map((response): Download => ({
						blob: response.body ?? new Blob(),
						fileName: dispositionFileName(response.headers.get('Content-Disposition'))
					})),
					catchError((error: unknown) =>
						from(withJsonBody(error)).pipe(
							switchMap((parsed) => throwError(() => toApiRequestError(parsed)))
						)
					)
				)
		);
	}

	post<T>(path: string, body: unknown = {}, options: RequestOptions = {}): Promise<T> {
		return firstValueFrom(
			this.http
				.post<T>(API_BASE + path, body, { params: toParams(options.params), ...this.context(options) })
				.pipe(catchError((error: unknown) => throwError(() => toApiRequestError(error))))
		);
	}

	private context(options: RequestOptions): { context?: HttpContext; headers?: Record<string, string> } {
		return {
			...(options.context === undefined ? {} : { context: options.context }),
			...(options.headers === undefined ? {} : { headers: { ...options.headers } })
		};
	}
}
