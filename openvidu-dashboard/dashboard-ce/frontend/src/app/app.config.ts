import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
	type ApplicationConfig,
	provideBrowserGlobalErrorListeners,
	provideZonelessChangeDetection
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { composeRoutes, DASHBOARD_INTERCEPTORS, DASHBOARD_ROUTES, provideDashboard } from '@openvidu-dashboard/ui';

export const appConfig: ApplicationConfig = {
	providers: [
		provideBrowserGlobalErrorListeners(),
		provideZonelessChangeDetection(),
		provideRouter(composeRoutes(DASHBOARD_ROUTES), withComponentInputBinding()),
		provideHttpClient(withInterceptors([...DASHBOARD_INTERCEPTORS])),
		provideDashboard()
	]
};
