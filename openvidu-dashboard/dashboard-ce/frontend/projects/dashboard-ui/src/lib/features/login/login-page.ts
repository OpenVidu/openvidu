import { NgOptimizedImage } from '@angular/common';
import { Component, computed, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { form, FormField, required, submit } from '@angular/forms/signals';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { ActivatedRoute, Router } from '@angular/router';

import { ExternalLink } from '../../components/external-link/external-link.js';
import { AuthService, safeRedirect } from '../../core/auth/auth.js';
import { toApiRequestError } from '../../core/http/api-error.js';
import { InfoService } from '../../core/info.js';
import { EXTERNAL_LINKS } from '../../core/links.js';
import { PRODUCT_NAME } from '../../core/providers.js';

/** Wait after a `429` without `Retry-After`. */
const DEFAULT_RETRY_SECONDS = 60;

/**
 * Sign-in with username and password: Enter submits, credentials are never stored, and errors are inline text
 * (invalid credentials, rate limit with a countdown, unreachable server with retry).
 */
@Component({
	selector: 'ovd-login-page',
	imports: [
		ExternalLink,
		FormField,
		MatButton,
		MatFormField,
		MatIcon,
		MatIconButton,
		MatInput,
		MatLabel,
		MatSuffix,
		NgOptimizedImage
	],
	templateUrl: './login-page.html',
	styleUrl: './login-page.scss'
})
export class LoginPage {
	private readonly auth = inject(AuthService);
	private readonly info = inject(InfoService);
	private readonly router = inject(Router);
	private readonly route = inject(ActivatedRoute);
	private readonly usernameInput = viewChild.required<string, ElementRef<HTMLInputElement>>('username', {
		read: ElementRef
	});
	private countdown: ReturnType<typeof setInterval> | undefined;

	protected readonly product = PRODUCT_NAME;
	protected readonly documentationUrl = EXTERNAL_LINKS.documentation;
	protected readonly credentials = signal({ username: '', password: '' });
	protected readonly loginForm = form(this.credentials, (path) => {
		required(path.username, { message: 'Enter the username' });
		required(path.password, { message: 'Enter the password' });
	});
	protected readonly showPassword = signal(false);
	protected readonly submitting = signal(false);
	protected readonly invalid = signal(false);
	protected readonly unreachable = signal(false);
	protected readonly retryIn = signal(0);
	protected readonly edition = computed(() => this.info.edition()?.toUpperCase() ?? null);
	protected readonly version = this.info.dashboardVersion;
	protected readonly message = computed(() => {
		if (this.retryIn() > 0) {
			return `Too many attempts, try again in ${String(this.retryIn())} s`;
		}

		return this.invalid() ? 'Invalid username or password' : null;
	});

	constructor() {
		inject(DestroyRef).onDestroy(() => {
			clearInterval(this.countdown);
		});
	}

	protected onSubmit(event: Event): void {
		event.preventDefault();

		if (this.submitting() || this.retryIn() > 0) {
			return;
		}

		void submit(this.loginForm, async () => {
			await this.signIn();

			return undefined;
		});
	}

	private async signIn(): Promise<void> {
		const { username, password } = this.credentials();

		this.submitting.set(true);
		this.invalid.set(false);
		this.unreachable.set(false);

		try {
			await this.auth.login(username, password);
			await this.info.load();
			await this.router.navigateByUrl(
				safeRedirect(this.route.snapshot.queryParamMap.get('redirect')) ?? '/overview'
			);
		} catch (error) {
			const failure = toApiRequestError(error);

			if (failure.code === 'RATE_LIMITED') {
				this.startCountdown(failure.retryAfter ?? DEFAULT_RETRY_SECONDS);
			} else if (failure.code === 'NETWORK_ERROR' || failure.status >= 500) {
				this.unreachable.set(true);
			} else {
				this.invalid.set(true);
				this.credentials.set({ username, password: '' });
				this.usernameInput().nativeElement.focus();
			}
		} finally {
			this.submitting.set(false);
		}
	}

	private startCountdown(seconds: number): void {
		clearInterval(this.countdown);
		this.retryIn.set(seconds);
		this.countdown = setInterval(() => {
			this.retryIn.update((left) => Math.max(0, left - 1));

			if (this.retryIn() === 0) {
				clearInterval(this.countdown);
			}
		}, 1000);
	}

	protected retry(): void {
		void this.info.load();
		void this.signIn();
	}
}
