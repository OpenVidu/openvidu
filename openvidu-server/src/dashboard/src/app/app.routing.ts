import { ModuleWithProviders } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from 'app/components/dashboard/dashboard.component';
import { LayoutBestFitComponent } from 'app/components/layouts/layout-best-fit/layout-best-fit.component';
import { SessionDetailsComponent } from 'app/components/session-details/session-details.component';
import { LayoutHorizontalPresentationComponent } from './components/layouts/layout-horizontal-presentation/layout-horizontal-presentation.component';
import { LayoutVerticalPresentationComponent } from './components/layouts/layout-vertical-presentation/layout-vertical-presentation.component';

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
    path: 'layout-best-fit/:sessionId/:secret/:port',
    component: LayoutBestFitComponent
  },
  {
    path: 'layout-best-fit/:sessionId/:secret/:port/:onlyVideo',
    component: LayoutBestFitComponent
  },
  {
    path: 'layout-vertical-presentation/:sessionId/:secret/:port',
    component: LayoutVerticalPresentationComponent
  },
  {
    path: 'layout-vertical-presentation/:sessionId/:secret/:port/:onlyVideo',
    component: LayoutVerticalPresentationComponent
  },
  {
    path: 'layout-horizontal-presentation/:sessionId/:secret/:port',
    component: LayoutHorizontalPresentationComponent
  },
  {
    path: 'layout-horizontal-presentation/:sessionId/:secret/:port/:onlyVideo',
    component: LayoutHorizontalPresentationComponent
  }
];

export const routing: ModuleWithProviders<RouterModule> = RouterModule.forRoot(appRoutes, { useHash: true });
