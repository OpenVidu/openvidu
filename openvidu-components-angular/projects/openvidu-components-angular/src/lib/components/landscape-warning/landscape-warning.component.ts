import { animate, style, transition, trigger } from '@angular/animations';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppMaterialModule } from '../../openvidu-components-angular.material.module';
import { TranslatePipe } from '../../pipes/translate.pipe';

/**
 * Component to display a landscape orientation warning on mobile devices.
 * @internal
 */
@Component({
	selector: 'ov-landscape-warning',
	templateUrl: './landscape-warning.component.html',
	styleUrl: './landscape-warning.component.scss',
	standalone: true,
	imports: [CommonModule, AppMaterialModule, TranslatePipe],
	animations: [
		trigger('inOutAnimation', [
			transition(':enter', [style({ opacity: 0 }), animate('200ms', style({ opacity: 1 }))]),
			transition(':leave', [animate('200ms', style({ opacity: 0 }))])
		])
	]
})
export class LandscapeWarningComponent {}
