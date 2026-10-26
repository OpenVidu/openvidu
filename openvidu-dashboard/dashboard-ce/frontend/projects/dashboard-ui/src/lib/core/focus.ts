import { LiveAnnouncer } from '@angular/cdk/a11y';
import { afterNextRender, DestroyRef, DOCUMENT, Injector, inject, Service } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

/** Id of the global search input, focused by the `/` shortcut. */
export const GLOBAL_SEARCH_ID = 'ovd-global-search';
/** Id of the main landmark, target of the skip link. */
export const MAIN_CONTENT_ID = 'ovd-main';

/** True when a key event comes from a field where `/` is text. */
export function isEditableTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) {
		return false;
	}

	return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/** Moves focus to an element that may not be focusable by default. */
export function focusElement(element: HTMLElement | null): boolean {
	if (element === null) {
		return false;
	}

	if (!element.hasAttribute('tabindex') && element.tabIndex < 0) {
		element.setAttribute('tabindex', '-1');
	}

	element.focus();

	return true;
}

/**
 * Keyboard and focus behaviour of the shell: when a navigation changes the page (not only its query parameters, and not
 * on the first load) focus moves to the page `h1` and its text is announced; `/` focuses the global search outside text
 * fields.
 */
@Service()
export class FocusService {
	private readonly document = inject(DOCUMENT);
	private readonly announcer = inject(LiveAnnouncer);
	private readonly injector = inject(Injector);
	private readonly router = inject(Router);
	private readonly destroyRef = inject(DestroyRef);
	private started = false;

	/** Starts listening; called once by the shell. */
	start(): void {
		if (this.started) {
			return;
		}

		this.started = true;

		let path: string | null = null;

		this.router.events
			.pipe(
				filter((event) => event instanceof NavigationEnd),
				takeUntilDestroyed(this.destroyRef)
			)
			.subscribe((event) => {
				const next = event.urlAfterRedirects.split(/[?#]/)[0] ?? '';
				const changed = path !== null && next !== path;

				path = next;

				if (changed) {
					afterNextRender(() => void this.focusPageTitle(), { injector: this.injector });
				}
			});

		const onKeydown = (event: KeyboardEvent): void => {
			this.handleShortcut(event);
		};

		this.document.addEventListener('keydown', onKeydown);
		this.destroyRef.onDestroy(() => {
			this.document.removeEventListener('keydown', onKeydown);
		});
	}

	/** `/` outside text fields focuses the global search. */
	handleShortcut(event: KeyboardEvent): void {
		if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey || isEditableTarget(event.target)) {
			return;
		}

		if (focusElement(this.document.getElementById(GLOBAL_SEARCH_ID))) {
			event.preventDefault();
		}
	}

	/** Focuses the `h1` of the main landmark and announces its text, unless the page already moved focus into it. */
	async focusPageTitle(): Promise<void> {
		const main = this.document.getElementById(MAIN_CONTENT_ID);
		const active = this.document.activeElement;

		if (main !== null && active !== null && active !== main && main.contains(active)) {
			return;
		}

		const heading = main?.querySelector<HTMLElement>('h1') ?? null;

		if (focusElement(heading) && heading !== null) {
			await this.announcer.announce(heading.textContent.trim(), 'polite');
		}
	}

	/** Focuses the main landmark; used by the skip link. */
	skipToContent(): void {
		focusElement(this.document.getElementById(MAIN_CONTENT_ID));
	}
}
