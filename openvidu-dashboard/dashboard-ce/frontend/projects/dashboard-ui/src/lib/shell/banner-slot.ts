import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatAnchor, MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';

import { ConnectivityService } from '../core/http/connectivity.js';
import { InfoService } from '../core/info.js';
import { ServerStatusService } from '../core/refresh/server-status.js';
import { deletionClassLabel } from '../format/deletions.js';
import { formatNumber } from '../format/formatters.js';

/**
 * Non-blocking banners under the header on every page: writer schema warnings, migration progress, a running deletion
 * (except on the Data tab, which shows its progress) and the silent writer from the server status, connectivity errors,
 * plus any banner a shell projects (`[ovdBanner]`). Every banner can be dismissed except the schema mismatch.
 */
@Component({
	selector: 'ovd-banner-slot',
	imports: [MatAnchor, MatButton, MatIcon, MatIconButton, MatProgressBar, RouterLink],
	template: `
		@if (schemaWarning(); as warning) {
			<div class="banner warning" role="alert">
				<mat-icon svgIcon="warning" aria-hidden="true" />
				<span class="text">{{ warning }}</span>
			</div>
		}
		@if (migration(); as progress) {
			@if (!dismissed().has('migration')) {
				<div class="banner info" role="status">
					<mat-icon svgIcon="sync" aria-hidden="true" />
					<div class="text">
						<span>Migration in progress: {{ progress.label }}</span>
						<mat-progress-bar
							mode="determinate"
							[value]="progress.percent"
							aria-label="Migration progress"
						/>
					</div>
					<button matIconButton type="button" aria-label="Dismiss" (click)="dismiss('migration')">
						<mat-icon svgIcon="close" />
					</button>
				</div>
			}
		}
		@if (deletion(); as job) {
			<div class="banner info deletion" role="status">
				<mat-icon svgIcon="delete" aria-hidden="true" />
				<span class="text">Deleting analytics data ({{ job.label }})… Lists and figures may change.</span>
				<a matButton routerLink="/settings" [queryParams]="{ tab: 'data' }">View progress</a>
				<button matIconButton type="button" aria-label="Dismiss" (click)="dismissedDeletion.set(job.id)">
					<mat-icon svgIcon="close" />
				</button>
			</div>
		}
		@if (!online() && !dismissed().has('connectivity')) {
			<div class="banner error" role="alert">
				<mat-icon svgIcon="cloud_off" aria-hidden="true" />
				<span class="text">The dashboard server is unreachable.</span>
				<button matButton type="button" (click)="retry()">Retry</button>
				<button matIconButton type="button" aria-label="Dismiss" (click)="dismiss('connectivity')">
					<mat-icon svgIcon="close" />
				</button>
			</div>
		}
		@if (writerWarning(); as warning) {
			@if (!dismissed().has('writer')) {
				<div class="banner warning" role="alert">
					<mat-icon svgIcon="warning" aria-hidden="true" />
					<span class="text">{{ warning }}</span>
					<button matIconButton type="button" aria-label="Dismiss" (click)="dismiss('writer')">
						<mat-icon svgIcon="close" />
					</button>
				</div>
			}
		}
		<ng-content />
	`,
	styles: `
		:host {
			display: flex;
			flex-direction: column;
		}

		.banner {
			display: flex;
			align-items: center;
			gap: 12px;
			padding: 8px 16px;
			border-bottom: 1px solid var(--mat-sys-outline-variant);
		}

		.text {
			display: flex;
			flex: 1;
			flex-direction: column;
			gap: 4px;
		}

		.info {
			background: var(--ovd-status-info-bg);
			color: var(--ovd-status-info-fg);
		}

		.warning {
			background: var(--ovd-status-warning-bg);
			color: var(--ovd-status-warning-fg);
		}

		.error {
			background: var(--mat-sys-error-container);
			color: var(--mat-sys-on-error-container);
		}
	`
})
export class BannerSlot {
	private readonly info = inject(InfoService);
	private readonly status = inject(ServerStatusService);
	private readonly connectivity = inject(ConnectivityService);
	private readonly router = inject(Router);
	private readonly url = signal(this.router.url);

	protected readonly dismissed = signal<ReadonlySet<string>>(new Set());
	protected readonly online = computed(
		() => this.connectivity.online() && this.info.error()?.code !== 'NETWORK_ERROR'
	);
	protected readonly schemaWarning = computed(() => {
		const schema = this.status.status()?.schema ?? this.info.info()?.schema;

		if (schema?.status === 'newer') {
			return `The OpenVidu server writes analytics schema v${String(schema.writer ?? '?')}, newer than v${String(schema.dashboard)} read by this dashboard. Update the dashboard.`;
		}

		if (schema?.status === 'uninitialized') {
			return 'The OpenVidu server has not initialized the analytics database yet.';
		}

		return null;
	});
	protected readonly migration = computed(() => {
		const migration = this.status.status()?.migration ?? this.info.migration();

		if (migration?.state !== 'running') {
			return null;
		}

		const processed = migration.progress?.processed ?? 0;
		const total = migration.progress?.total ?? 0;

		return {
			label: `${formatNumber(processed)} / ${formatNumber(total)} records`,
			percent: total > 0 ? (processed / total) * 100 : 0
		};
	});

	/** The job whose deletion banner was dismissed; the banner shows again for the next job. */
	protected readonly dismissedDeletion = signal<string | null>(null);
	/** The Data tab of Settings, which shows the progress of a deletion instead of its banner. */
	private readonly onDataTab = computed(() => {
		const tree = this.router.parseUrl(this.url());
		const segments = tree.root.children['primary']?.segments ?? [];

		return segments.at(-1)?.path === 'settings' && tree.queryParams['tab'] === 'data';
	});
	protected readonly deletion = computed(() => {
		const job = this.status.status()?.deletion;

		if (job?.state !== 'running' || job.id === this.dismissedDeletion() || this.onDataTab()) {
			return null;
		}

		return { id: job.id, label: deletionClassLabel(job.class) };
	});

	protected readonly writerWarning = computed(() => {
		if (!this.status.writerSilent()) {
			return null;
		}

		const age = this.status.writerAgeMs();

		return age === null
			? 'No analytics data received from the OpenVidu server'
			: `No analytics data received for ${String(Math.max(1, Math.floor(age / 60_000)))} min`;
	});

	constructor() {
		this.router.events
			.pipe(
				filter((event) => event instanceof NavigationEnd),
				takeUntilDestroyed()
			)
			.subscribe(() => {
				this.url.set(this.router.url);
			});

		// A dismissed writer banner comes back the next time the writer goes silent.
		effect(() => {
			if (this.writerWarning() === null) {
				untracked(() => {
					this.dismissed.set(new Set([...this.dismissed()].filter((banner) => banner !== 'writer')));
				});
			}
		});
	}

	protected dismiss(banner: string): void {
		this.dismissed.set(new Set([...this.dismissed(), banner]));
	}

	protected retry(): void {
		void this.info.load();
	}
}
