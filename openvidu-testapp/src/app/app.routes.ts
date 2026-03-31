import { Routes } from '@angular/router';

import { TestScenariosComponent } from './components/test-scenarios/test-scenarios.component';
import { TestSessionsComponent } from './components/test-sessions/test-sessions.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/test-sessions',
    pathMatch: 'full',
  },
  {
    path: 'test-sessions',
    component: TestSessionsComponent,
  },
  {
    path: 'test-scenarios',
    component: TestScenariosComponent,
  },
];
