import { ModuleWithProviders } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { TestSessionsComponent } from './components/test-sessions/test-sessions.component';
import { TestApirestComponent } from './components/test-apirest/test-apirest.component';

const appRoutes: Routes = [
  {
    path: '', redirectTo: '/test-sessions', pathMatch: 'full'
  },
  {
    path: 'test-sessions',
    component: TestSessionsComponent
  },
  {
    path: 'test-apirest',
    component: TestApirestComponent
  }
];

export const routing: ModuleWithProviders = RouterModule.forRoot(appRoutes, { useHash: true });
