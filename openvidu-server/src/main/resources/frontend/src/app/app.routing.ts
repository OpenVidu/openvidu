import { ModuleWithProviders } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DashboardComponent } from 'app/components/dashboard/dashboard.component';
import { SessionDetailsComponent } from 'app/components/session-details/session-details.component';

const appRoutes: Routes = [
  {
    path: '',
    component: DashboardComponent
  },
  {
    path: 'session/:id',
    component: SessionDetailsComponent
  }
];

export const routing: ModuleWithProviders = RouterModule.forRoot(appRoutes);
