import { ModuleWithProviders } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { PresentationComponent } from './components/presentation/presentation.component';
import { DashboardComponent } from './components/dashboard/dahsboard.component';
import { LessonDetailsComponent } from './components/lesson-details/lesson-details.component';
import { ProfileComponent } from './components/profile/profile.component';
import { VideoSessionComponent } from './components/video-session/video-session.component';

import { AuthGuard } from './auth.guard';

const appRoutes: Routes = [
  {
    path: '',
    component: PresentationComponent,
    pathMatch: 'full',
  },
  {
    path: 'lessons',
    component: DashboardComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'lesson-details/:id',
    component: LessonDetailsComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'profile',
    component: ProfileComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'lesson/:id',
    component: VideoSessionComponent,
    canActivate: [AuthGuard]
  },
];

export const routing: ModuleWithProviders = RouterModule.forRoot(appRoutes);
