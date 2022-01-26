import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { CallComponent } from './openvidu-call/call.component';
import { ToolbarTestComponent } from './components/toolbar-test/toolbar-test.component';
import { ChatTestComponent } from './components/chat-test/chat-test.component';
import { LayoutTestComponent } from './components/layout-test/layout-test.component';
import { StreamTestComponent } from './components/stream-test/stream-test.component';

const routes: Routes = [
	{ path: '', component: DashboardComponent },
	{ path: 'call', component: CallComponent },
	{ path: 'toolbar', component: ToolbarTestComponent },
	{ path: 'chat', component: ChatTestComponent },
	{ path: 'layout', component: LayoutTestComponent },
	{ path: 'stream', component: StreamTestComponent }
];
@NgModule({
	imports: [RouterModule.forRoot(routes, { useHash: true })],
	exports: [RouterModule]
})
export class AppRoutingModule {}
