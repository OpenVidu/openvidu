import { ModuleWithProviders } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DashboardComponent } from './components/dashboard/dashboard.component';
import { SessionComponent } from './components/session/session.component';

const appRoutes: Routes = [
  {
    path: '',
    component: DashboardComponent
  },
  {
    path: 'session/:session-name',
    component: SessionComponent
  }
];

export const routing: ModuleWithProviders = RouterModule.forRoot(appRoutes);
