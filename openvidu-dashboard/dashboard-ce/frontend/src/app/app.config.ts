import { provideHttpClient, withInterceptors, withNoXsrfProtection } from '@angular/common/http';
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
		// Bearer tokens and a SameSite=Strict refresh cookie: no XSRF cookie to read on every write.
		provideHttpClient(withInterceptors([...DASHBOARD_INTERCEPTORS]), withNoXsrfProtection()),
		provideDashboard()
	]
};
