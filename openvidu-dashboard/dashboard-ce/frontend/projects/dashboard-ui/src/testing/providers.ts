import { importProvidersFrom } from '@angular/core';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { MatIconTestingModule } from '@angular/material/icon/testing';

/**
 * Providers of every unit test: icons resolve to empty SVGs instead of fetching the sprite, and Material skips its
 * animations, whose end events jsdom never fires.
 */
export default [
	importProvidersFrom(MatIconTestingModule),
	{ provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } }
];
