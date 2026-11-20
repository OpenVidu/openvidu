import { NgTemplateOutlet } from '@angular/common';
import { Component, inject, Service, signal, type TemplateRef } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import {
	MAT_DIALOG_DATA,
	MatDialog,
	MatDialogActions,
	MatDialogContent,
	MatDialogRef,
	MatDialogTitle
} from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';

/** What a confirmation dialog asks. */
export interface ConfirmDialogData {
	title: string;
	/** Body: a text, or a template (links, several paragraphs) rendered with `bodyContext` as `$implicit`. */
	body: string | TemplateRef<unknown>;
	bodyContext?: unknown;
	/** Label of the confirm button, in the error colour, such as "Delete". */
	confirmLabel: string;
	/** An unchecked checkbox under the body, and the note shown under it while checked. */
	checkbox?: { label: string; note?: string };
}

/** A confirmed dialog: whether its checkbox was checked. */
export interface ConfirmDialogResult {
	checked: boolean;
}

/**
 * Confirms a destructive action: title, body, optional checkbox, then Cancel and the confirm button in the error colour.
 * Opened by {@link ConfirmDialogService}, with focus on Cancel; Escape and a click outside cancel.
 */
@Component({
	selector: 'ovd-confirm-dialog',
	imports: [MatButton, MatCheckbox, MatDialogActions, MatDialogContent, MatDialogTitle, NgTemplateOutlet],
	template: `
		<h2 mat-dialog-title>{{ data.title }}</h2>
		<mat-dialog-content>
			@if (isText(data.body)) {
				<p>{{ data.body }}</p>
			} @else {
				<ng-container
					[ngTemplateOutlet]="data.body"
					[ngTemplateOutletContext]="{ $implicit: data.bodyContext }"
				/>
			}
			@if (data.checkbox; as checkbox) {
				<mat-checkbox class="checkbox" [checked]="checked()" (change)="checked.set($event.checked)">
					{{ checkbox.label }}
				</mat-checkbox>
				@if (checked() && checkbox.note) {
					<p class="note">{{ checkbox.note }}</p>
				}
			}
		</mat-dialog-content>
		<mat-dialog-actions align="end">
			<button matButton type="button" class="ovd-confirm-cancel" (click)="cancel()">Cancel</button>
			<button matButton="filled" type="button" class="confirm" (click)="confirm()">
				{{ data.confirmLabel }}
			</button>
		</mat-dialog-actions>
	`,
	styles: `
		:host {
			display: block;
		}

		/* The vertical margin holds the 48 px touch target around the 40 px checkbox, which would else make the content
		   scroll when the checkbox ends it. */
		.checkbox {
			display: block;
			margin-block: 4px;
			margin-inline-start: -8px;
		}

		.note {
			color: var(--mat-sys-error);
		}

		.confirm {
			--mat-button-filled-container-color: var(--mat-sys-error);
			--mat-button-filled-label-text-color: var(--mat-sys-on-error);
			--mat-button-filled-state-layer-color: var(--mat-sys-on-error);
			--mat-button-filled-ripple-color: color-mix(in srgb, var(--mat-sys-on-error) 12%, transparent);
		}
	`
})
export class ConfirmDialog {
	protected readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
	private readonly ref = inject<MatDialogRef<ConfirmDialog, ConfirmDialogResult>>(MatDialogRef);

	protected readonly checked = signal(false);

	protected isText(body: ConfirmDialogData['body']): body is string {
		return typeof body === 'string';
	}

	protected cancel(): void {
		this.ref.close();
	}

	protected confirm(): void {
		this.ref.close({ checked: this.checked() });
	}
}

/** Opens confirmation dialogs; focus returns to the control that opened one when it closes. */
@Service()
export class ConfirmDialogService {
	private readonly dialog = inject(MatDialog);

	/** @returns the result when confirmed, `null` when cancelled */
	async confirm(data: ConfirmDialogData): Promise<ConfirmDialogResult | null> {
		const ref = this.dialog.open<ConfirmDialog, ConfirmDialogData, ConfirmDialogResult>(ConfirmDialog, {
			data,
			autoFocus: '.ovd-confirm-cancel',
			restoreFocus: true,
			width: 'min(560px, calc(100vw - 32px))',
			maxWidth: 'calc(100vw - 32px)'
		});

		return (await firstValueFrom(ref.afterClosed())) ?? null;
	}
}
