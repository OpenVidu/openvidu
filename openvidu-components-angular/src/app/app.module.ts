import { BrowserModule } from '@angular/platform-browser';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app.routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

import { environment } from 'src/environments/environment';

import { CallComponent } from './openvidu-call/call.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { TestingComponent } from './testing-app/testing.component';
import { AdminDashboardComponent } from './admin/admin-dashboard/admin-dashboard.component';
// openvidu-angular
import { OpenViduAngularModule } from 'openvidu-angular';

@NgModule({
	declarations: [AppComponent, DashboardComponent, AdminDashboardComponent, CallComponent, TestingComponent],
	imports: [
		BrowserModule,
		MatCheckboxModule,
		MatButtonModule,
		MatIconModule,
		MatMenuModule,
		BrowserAnimationsModule,
		OpenViduAngularModule.forRoot(environment),
		AppRoutingModule // Order is important, AppRoutingModule must be the last import for useHash working
	],
	providers: [],
	bootstrap: [AppComponent]
})
export class AppModule {}
