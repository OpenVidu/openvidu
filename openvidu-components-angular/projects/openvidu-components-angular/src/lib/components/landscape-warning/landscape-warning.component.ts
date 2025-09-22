import { animate, style, transition, trigger } from '@angular/animations';
import { Component } from '@angular/core';

/**
 * Component to display a landscape orientation warning on mobile devices.
 * @internal
 */
@Component({
	selector: 'ov-landscape-warning',
	templateUrl: './landscape-warning.component.html',
	styleUrl: './landscape-warning.component.scss',
	standalone: false,
	animations: [
		trigger('inOutAnimation', [
			transition(':enter', [style({ opacity: 0 }), animate('200ms', style({ opacity: 1 }))]),
			transition(':leave', [animate('200ms', style({ opacity: 0 }))])
		])
	]
})
export class LandscapeWarningComponent {}
