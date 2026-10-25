/**
 * Weak comparison of an `If-None-Match` header with the current validator (RFC 9110, 13.1.2). Express's `req.fresh`
 * is not used: fetch and XMLHttpRequest add `Cache-Control: no-cache` to every request carrying `If-None-Match`, and
 * `req.fresh` then always reports the representation as stale.
 */
export function ifNoneMatchMatches(header: string | undefined, etag: string): boolean {
	if (header === undefined) {
		return false;
	}

	const opaque = (tag: string) => tag.trim().replace(/^W\//, '');
	const current = opaque(etag);

	return header.split(',').some((tag) => tag.trim() === '*' || opaque(tag) === current);
}
