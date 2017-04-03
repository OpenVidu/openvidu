import { Component, OnInit, AfterViewChecked } from '@angular/core';
import { Router } from '@angular/router';
import { AuthenticationService } from '../../services/authentication.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-presentation',
  templateUrl: './presentation.component.html',
  styleUrls: ['./presentation.component.css']
})

export class PresentationComponent implements OnInit, AfterViewChecked {

  private email: string;
  private password: string;
  private confirmPassword: string;
  private nickName: string;
  private roleUserSignup = 'student';

  private loginView = true;
  private fieldsIncorrect: boolean;
  private submitProcessing: boolean;

  // Error message content
  private errorTitle: string;
  private errorContent: string;
  private customClass: string;

  constructor(
    private authenticationService: AuthenticationService,
    private userService: UserService,
    private router: Router) { }

  ngOnInit() { }

  // If the user is loggedIn, navigates to dashboard
  ngAfterViewChecked() {
    if (this.authenticationService.isLoggedIn()) {
      this.router.navigate(['/lessons']);
    }
  }

  setLoginView(option: boolean) {
    this.fieldsIncorrect = false;
    this.loginView = option;
  }

  onSubmit() {
    console.log('Submit: email = ' + this.email + ' , password = ' + this.password + ', confirmPassword = ' + this.confirmPassword);
    this.submitProcessing = true;

    if (this.loginView) {
      // If login view is activated
      console.log('Logging in...');
      this.logIn(this.email, this.password);
    } else {
      // If signup view is activated
      console.log('Signing up...');
      this.signUp();
    }
  }

  logIn(user: string, pass: string) {
    this.authenticationService.logIn(user, pass).subscribe(
      result => {
        this.submitProcessing = false;

        console.log('Login succesful! LOGGED AS ' + this.authenticationService.getCurrentUser().name);

        // Login successful
        this.fieldsIncorrect = false;
        this.router.navigate(['/lessons']);
      },
      error => {

        console.log('Login failed (error): ' + error);

        this.errorTitle = 'Invalid field';
        this.errorContent = 'Please check your email or password';
        this.customClass = 'fail';

        // Login failed
        this.handleError();
      }
    );
  }

  signUp() {

    // Passwords don't match
    if (this.password !== this.confirmPassword) {
      this.errorTitle = 'Your passwords don\'t match!';
      this.errorContent = '';
      this.customClass = 'fail';
      this.handleError();
    }

    else {

      let userNameFixed = this.email;
      let userPasswordFixed = this.password;

      this.userService.newUser(userNameFixed, userPasswordFixed, this.nickName, this.roleUserSignup).subscribe(
        result => {

          // Sign up succesful
          this.logIn(userNameFixed, userPasswordFixed);
          console.log('Sign up succesful!');
        },
        error => {

          console.log('Sign up failed (error): ' + error);
          if (error === 409) { // CONFLICT: Email already in use
            this.errorTitle = 'Invalid email';
            this.errorContent = 'That email is already in use';
            this.customClass = 'fail';
          } else if (error === 403) { // FORBIDDEN: Invalid email format
            this.errorTitle = 'Invalid email format';
            this.errorContent = 'Our server has rejected that email';
            this.customClass = 'fail';
          }

          // Sign up failed
          this.handleError();
        }
      );
    }
  }

  handleError() {
    this.submitProcessing = false;
    this.fieldsIncorrect = true;
  }
}
