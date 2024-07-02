import { NgModule } from '@angular/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { BrowserModule } from '@angular/platform-browser';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app.routing.module';

import { environment } from 'src/environments/environment';

import { AdminDashboardComponent } from './admin/admin-dashboard/admin-dashboard.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { CallComponent } from './openvidu-call/call.component';
import { TestingComponent } from './testing-app/testing.component';
// openvidu-components-angular
import { OpenViduComponentsModule } from 'openvidu-components-angular';

@NgModule({
	declarations: [AppComponent, DashboardComponent, AdminDashboardComponent, CallComponent, TestingComponent],
	imports: [
		BrowserModule,
		MatCheckboxModule,
		MatButtonModule,
		MatIconModule,
		MatMenuModule,
		MatTooltipModule,
		BrowserAnimationsModule,
		OpenViduComponentsModule.forRoot(environment),
		AppRoutingModule // Order is important, AppRoutingModule must be the last import for useHash working
	],
	providers: [],
	bootstrap: [AppComponent]
})
export class AppModule {}
