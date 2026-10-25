import type { HttpInterceptorFn } from '@angular/common/http';
import {
	type EnvironmentProviders,
	inject,
	Injectable,
	makeEnvironmentProviders,
	provideAppInitializer
} from '@angular/core';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer, Title } from '@angular/platform-browser';
import { type RouterStateSnapshot, TitleStrategy } from '@angular/router';

import { authInterceptor, AuthService } from './auth.js';
import { connectivityInterceptor } from './connectivity.js';
import { InfoService, proFeatureInterceptor } from './info.js';
import { ThemeService } from './theme.js';

export const PRODUCT_NAME = 'OpenVidu Dashboard';
/** Icon sprite built by `scripts/icons.mjs`, relative to the document base. */
export const ICON_SPRITE_URL = 'assets/icons.svg';

/** Interceptors of the dashboard, in order: session, PRO feature flags, connectivity. */
export const DASHBOARD_INTERCEPTORS: readonly HttpInterceptorFn[] = [
	authInterceptor,
	proFeatureInterceptor,
	connectivityInterceptor
];

/** Document titles as "{page} · OpenVidu Dashboard". */
@Injectable()
export class DashboardTitleStrategy extends TitleStrategy {
	private readonly title = inject(Title);

	override updateTitle(snapshot: RouterStateSnapshot): void {
		const page = this.buildTitle(snapshot);

		this.title.setTitle(page === undefined ? PRODUCT_NAME : `${page} · ${PRODUCT_NAME}`);
	}
}

/**
 * Providers every dashboard shell needs besides the router and HttpClient: the icon sprite, the theme, the silent
 * session restore followed by the info document, page titles and Material defaults.
 */
export function provideDashboard(): EnvironmentProviders {
	return makeEnvironmentProviders([
		{ provide: TitleStrategy, useClass: DashboardTitleStrategy },
		{ provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { appearance: 'outline', subscriptSizing: 'dynamic' } },
		provideAppInitializer(async () => {
			inject(MatIconRegistry).addSvgIconSet(inject(DomSanitizer).bypassSecurityTrustResourceUrl(ICON_SPRITE_URL));
			inject(ThemeService);

			const auth = inject(AuthService);
			const info = inject(InfoService);

			await auth.restore();
			await info.load();
		})
	]);
}
