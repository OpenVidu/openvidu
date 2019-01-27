import { ModuleWithProviders } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DashboardComponent } from 'app/components/dashboard/dashboard.component';
import { SessionDetailsComponent } from 'app/components/session-details/session-details.component';
import { LayoutBestFitComponent } from 'app/components/layouts/layout-best-fit/layout-best-fit.component';

const appRoutes: Routes = [
  {
    path: '',
    component: DashboardComponent
  },
  {
    path: 'session/:sessionId',
    component: SessionDetailsComponent
  },
  {
    path: 'layout-best-fit/:sessionId/:secret',
    component: LayoutBestFitComponent
  },
  {
    path: 'layout-best-fit/:sessionId/:secret/:onlyVideo',
    component: LayoutBestFitComponent
  }
];

export const routing: ModuleWithProviders = RouterModule.forRoot(appRoutes, { useHash: true });
