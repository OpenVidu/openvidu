import { BREAKPOINT, LayoutDirective } from '@angular/flex-layout';
import { Directive } from '@angular/core';
import {  } from '@angular/flex-layout';


const LANDSCAPE_BREAKPOINTS = [
	{
		alias: 'landscape',
		suffix: 'Landscape',
		mediaQuery: 'screen and (orientation: landscape)',
		overlapping: false,
		priority: 2001
	}
];

export const CustomBreakPointsProvider = {
	provide: BREAKPOINT,
	useValue: LANDSCAPE_BREAKPOINTS,
	multi: true
};


const selector = `[fxLayout.landscape]`;
const inputs = ['fxLayout.landscape'];

@Directive({ selector, inputs })
export class CustomLayoutExtensionDirective extends LayoutDirective {
	protected inputs = inputs;
}
