import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { AuthenticationService } from './services/authentication.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

  constructor(private router: Router, private authenticationService: AuthenticationService) { }

  isVideoSessionUrl() {
    return (this.router.url.substring(0, '/lesson/'.length) === '/lesson/');
  }
}
