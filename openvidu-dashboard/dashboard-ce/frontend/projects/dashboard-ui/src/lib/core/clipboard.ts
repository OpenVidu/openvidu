import { DOCUMENT, inject, Service } from '@angular/core';

/** `copied` when the clipboard API wrote the value; `selected` when it was selected for the user to copy. */
export type CopyResult = 'copied' | 'selected';

/** Clipboard writes with the fallback for insecure contexts, where `navigator.clipboard` does not exist. */
@Service()
export class ClipboardService {
	private readonly document = inject(DOCUMENT);

	async copy(value: string, element: Element | null): Promise<CopyResult> {
		const view = this.document.defaultView;
		const clipboard = view?.isSecureContext === true ? view.navigator.clipboard : undefined;

		if (clipboard !== undefined) {
			try {
				await clipboard.writeText(value);

				return 'copied';
			} catch {
				// Permission denied: select the text instead.
			}
		}

		if (element !== null && view !== null) {
			const range = this.document.createRange();
			const selection = view.getSelection();

			range.selectNodeContents(element);
			selection?.removeAllRanges();
			selection?.addRange(range);
		}

		return 'selected';
	}
}
