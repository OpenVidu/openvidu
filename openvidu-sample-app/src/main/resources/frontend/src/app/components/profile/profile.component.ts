import { Component, OnInit } from '@angular/core';

import { AuthenticationService } from '../../services/authentication.service';
import { User } from '../../models/user';

@Component({
    selector: 'app-profile',
    templateUrl: './profile.component.html',
    styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {

    private user: User;

    constructor(private authenticationService: AuthenticationService) { }

    ngOnInit() {
        this.user = this.authenticationService.getCurrentUser();
    }

}
