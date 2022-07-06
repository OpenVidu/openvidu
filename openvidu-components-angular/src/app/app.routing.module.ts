import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { CallComponent } from './openvidu-call/call.component';
import { TestingComponent } from './testing-app/testing.component';
import { AdminDashboardComponent } from './admin/admin-dashboard/admin-dashboard.component';

const routes: Routes = [
	{ path: '', component: DashboardComponent },
	{ path: 'call', component: CallComponent },
	{ path: 'testing', component: TestingComponent },
	{ path: 'admin', component: AdminDashboardComponent },
];
@NgModule({
	imports: [RouterModule.forRoot(routes, { useHash: true })],
	exports: [RouterModule]
})
export class AppRoutingModule {}
