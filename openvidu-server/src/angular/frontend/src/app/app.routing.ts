import { ModuleWithProviders } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DashboardComponent } from 'app/components/dashboard/dashboard.component';
import { SessionDetailsComponent } from 'app/components/session-details/session-details.component';
import { LayoutBestFitComponent } from 'app/components/layouts/layout-best-fit/layout-best-fit.component';

const appRoutes: Routes = [
  {
    path: '',
    component: DashboardComponent,
    pathMatch: 'full'
  },
  {
    path: 'session/:sessionId',
    component: SessionDetailsComponent,
    pathMatch: 'full'
  },
  {
    path: 'layout-best-fit/:sessionId/:secret',
    component: LayoutBestFitComponent,
    pathMatch: 'full'
  }
];

export const routing: ModuleWithProviders = RouterModule.forRoot(appRoutes, { useHash: true });

