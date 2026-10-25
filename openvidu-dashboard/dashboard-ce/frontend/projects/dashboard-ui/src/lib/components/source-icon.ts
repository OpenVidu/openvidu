import { Component, computed, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import type { TrackSource } from '@openvidu-dashboard/typings';

export const SOURCE_ICONS: Readonly<Record<TrackSource, string>> = {
	CAMERA: 'videocam',
	MICROPHONE: 'mic',
	SCREEN_SHARE: 'screen_share',
	SCREEN_SHARE_AUDIO: 'volume_up',
	UNKNOWN: 'help'
};

export const SOURCE_LABELS: Readonly<Record<TrackSource, string>> = {
	CAMERA: 'Camera',
	MICROPHONE: 'Microphone',
	SCREEN_SHARE: 'Screen share',
	SCREEN_SHARE_AUDIO: 'Screen share audio',
	UNKNOWN: 'Unknown source'
};

/** A track source as an icon, named by its tooltip and accessible label. */
@Component({
	selector: 'ovd-source-icon',
	imports: [MatIcon, MatTooltip],
	template: `<span class="icon" role="img" tabindex="0" [attr.aria-label]="label()" [matTooltip]="label()">
		<mat-icon [svgIcon]="icon()" aria-hidden="true" />
	</span>`,
	styles: `
		:host {
			display: inline-flex;
			vertical-align: middle;
			color: var(--mat-sys-on-surface-variant);
		}

		.icon {
			display: inline-flex;
		}

		mat-icon {
			width: 20px;
			height: 20px;
		}
	`
})
export class SourceIcon {
	readonly source = input.required<TrackSource>();

	protected readonly icon = computed(() => SOURCE_ICONS[this.source()]);
	protected readonly label = computed(() => SOURCE_LABELS[this.source()]);
}
