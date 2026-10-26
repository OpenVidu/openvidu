import { inject } from '@angular/core';
import { Router, type UrlSegment } from '@angular/router';
import type { NavigationMeta } from '@openvidu-dashboard/typings';

import { authGuard, AuthService, loginGuard } from './core/auth/auth.js';
import type { DashboardRoute } from './routing/compose-routes.js';
import { DashboardShell } from './shell/dashboard-shell/dashboard-shell.js';

function navigation(meta: NavigationMeta): { navigation: NavigationMeta } {
	return { navigation: meta };
}

/**
 * Unknown paths: the overview when signed in, otherwise the login with the unknown path to return to. It runs while the
 * route is recognised, before the shell's guard, which would otherwise only see the overview.
 */
function unknownPath({ url, queryParams }: { url: UrlSegment[]; queryParams: Record<string, unknown> }) {
	if (inject(AuthService).authenticated()) {
		return '/overview';
	}

	const router = inject(Router);
	const target = router.serializeUrl(
		router.createUrlTree(['/', ...url.map((segment) => segment.path)], { queryParams })
	);

	return router.createUrlTree(['/login'], { queryParams: { redirect: target } });
}

/**
 * Routes of the dashboard. Orders leave gaps so a PRO config can insert entries; a later config passed to
 * `composeRoutes()` replaces any route by path and keeps the navigation metadata it does not set.
 */
export const DASHBOARD_ROUTES: DashboardRoute[] = [
	{
		path: 'login',
		title: 'Sign in',
		canActivate: [loginGuard],
		loadComponent: () => import('./features/login/login-page.js').then((module) => module.LoginPage)
	},
	{
		path: '',
		component: DashboardShell,
		canActivate: [authGuard],
		children: [
			{ path: '', pathMatch: 'full', redirectTo: 'overview' },
			{
				path: 'overview',
				title: 'Overview',
				loadComponent: () =>
					import('./features/overview/overview-page.js').then((module) => module.OverviewPage),
				data: navigation({
					label: 'Overview',
					icon: 'dashboard',
					path: '/overview',
					order: 10,
					liveCapable: true,
					rangeScoped: false,
					timed: true
				})
			},
			{
				path: 'analytics',
				title: 'Analytics',
				loadComponent: () =>
					import('./features/analytics/analytics-page.js').then((module) => module.AnalyticsPage),
				data: navigation({
					label: 'Analytics',
					icon: 'monitoring',
					path: '/analytics',
					order: 20,
					liveCapable: true,
					rangeScoped: true,
					timed: true,
					retention: 'rollupsDailyMs'
				})
			},
			{
				path: 'rooms',
				data: navigation({
					label: 'Rooms',
					icon: 'meeting_room',
					path: '/rooms',
					order: 30,
					liveCapable: true,
					rangeScoped: true,
					timed: true,
					retention: 'entitiesMs'
				}),
				children: [
					{
						path: '',
						title: 'Rooms',
						loadComponent: () => import('./features/rooms/rooms-page.js').then((module) => module.RoomsPage)
					},
					{
						path: ':roomSid',
						title: 'Room',
						loadComponent: () =>
							import('./features/rooms/room-locked-page.js').then((module) => module.RoomLockedPage),
						data: {
							page: { feature: 'room-detail', liveCapable: true, rangeScoped: false, timed: true },
							breadcrumb: { param: 'roomSid' },
							entity: { kind: 'room', param: 'roomSid' }
						}
					}
				]
			},
			{
				path: 'participants',
				data: navigation({
					label: 'Participants',
					icon: 'group',
					path: '/participants',
					order: 40,
					liveCapable: true,
					rangeScoped: true,
					timed: true,
					retention: 'entitiesMs'
				}),
				children: [
					{
						path: '',
						title: 'Participants',
						loadComponent: () =>
							import('./features/participants/participants-page.js').then(
								(module) => module.ParticipantsPage
							)
					},
					{
						path: ':participantSid',
						title: 'Participant',
						loadComponent: () =>
							import('./features/participants/participant-locked-page.js').then(
								(module) => module.ParticipantLockedPage
							),
						data: {
							page: { feature: 'participant-detail', liveCapable: true, rangeScoped: false, timed: true },
							breadcrumb: { param: 'participantSid' },
							entity: { kind: 'participant', param: 'participantSid' }
						}
					}
				]
			},
			{
				path: 'agents',
				title: 'Agents',
				loadComponent: () => import('./features/agents/agents-page.js').then((module) => module.AgentsPage),
				data: navigation({
					label: 'Agents',
					icon: 'smart_toy',
					path: '/agents',
					order: 50,
					liveCapable: true,
					rangeScoped: true,
					timed: true,
					retention: 'entitiesMs'
				})
			},
			{
				path: 'egress',
				data: navigation({
					label: 'Egress',
					icon: 'output',
					path: '/egress',
					order: 60,
					liveCapable: true,
					rangeScoped: true,
					timed: true,
					retention: 'entitiesMs'
				}),
				children: [
					{
						path: '',
						title: 'Egress',
						loadComponent: () =>
							import('./features/egress/egress-page.js').then((module) => module.EgressPage)
					},
					{
						path: ':egressId',
						title: 'Egress',
						loadComponent: () =>
							import('./features/egress/egress-locked-page.js').then((module) => module.EgressLockedPage),
						data: {
							page: { feature: 'egress-detail', liveCapable: true, rangeScoped: false, timed: true },
							breadcrumb: { param: 'egressId' },
							entity: { kind: 'egress', param: 'egressId' }
						}
					}
				]
			},
			{
				path: 'ingress',
				data: navigation({
					label: 'Ingress',
					icon: 'input',
					path: '/ingress',
					order: 70,
					liveCapable: true,
					rangeScoped: true,
					timed: true,
					retention: 'entitiesMs'
				}),
				children: [
					{
						path: '',
						title: 'Ingress',
						loadComponent: () =>
							import('./features/ingress/ingress-page.js').then((module) => module.IngressPage)
					},
					{
						path: ':ingressId',
						title: 'Ingress',
						loadComponent: () =>
							import('./features/ingress/ingress-locked-page.js').then(
								(module) => module.IngressLockedPage
							),
						data: {
							page: { feature: 'ingress-detail', liveCapable: true, rangeScoped: false, timed: true },
							breadcrumb: { param: 'ingressId' },
							entity: { kind: 'ingress', param: 'ingressId' }
						}
					}
				]
			},
			{
				path: 'settings',
				title: 'Settings',
				loadComponent: () =>
					import('./features/settings/settings-page.js').then((module) => module.SettingsPage),
				data: navigation({
					label: 'Settings',
					icon: 'settings',
					path: '/settings',
					order: 90,
					liveCapable: false,
					rangeScoped: false,
					timed: false
				})
			},
			{ path: '**', redirectTo: unknownPath }
		]
	}
];
