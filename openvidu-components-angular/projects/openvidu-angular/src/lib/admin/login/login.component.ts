import { Component, ElementRef, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';
import { UntypedFormControl, Validators, FormGroupDirective, NgForm } from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import { Subscription } from 'rxjs';
import { ActionService } from '../../services/action/action.service';
import { OpenViduAngularConfigService } from '../../services/config/openvidu-angular.config.service';

@Component({
	selector: 'ov-admin-login',
	templateUrl: './login.component.html',
	styleUrls: ['./login.component.css']
})
export class AdminLoginComponent implements OnInit {
	/**
	 * Provides event notifications that fire when login button has been clicked.
	 * The event will contain the password value.
	 */
	@Output() onLoginButtonClicked: EventEmitter<string> = new EventEmitter<string>();

	/**
	 * @internal
	 */
	checkingLogged = false;
	/**
	 * @internal
	 */
	secret: string;
	/**
	 * @internal
	 */
	showSpinner = false;

	/**
	 * @internal
	 */
	loginFormControl = new UntypedFormControl('', [Validators.required]);
	/**
	 * @internal
	 */
	matcher = new FormErrorStateMatcher();

	/**
	 * @internal
	 */
	@ViewChild('submitBtn') submitBtn: ElementRef;
	/**
	 * @internal
	 */
	@ViewChild('loginForm', { read: ElementRef }) loginForm: ElementRef;

	private errorSub: Subscription;

	/**
	 * @internal
	 */
	constructor(private libService: OpenViduAngularConfigService, private actionService: ActionService) {}

	/**
	 * @internal
	 */
	ngOnInit() {
		this.subscribeToAdminLoginDirectives();
	}

	/**
	 * @internal
	 */
	ngOnDestroy() {
		this.showSpinner = false;
		if (this.errorSub) this.errorSub.unsubscribe();
	}

	/**
	 * @internal
	 */
	login() {
		this.showSpinner = true;
		this.onLoginButtonClicked.emit(this.secret);
	}

	/**
	 * @internal
	 */
	submitForm() {
		if (this.loginForm.nativeElement.checkValidity()) {
			this.login();
		} else {
			this.submitBtn.nativeElement.click();
		}
	}

	private subscribeToAdminLoginDirectives() {
		this.errorSub = this.libService.adminLoginErrorObs.subscribe((value) => {
			const errorExists = !!value;
			if (errorExists) {
				this.showSpinner = false;
				this.actionService.openDialog(value.error, value.message, true);
			}
		});
	}
}
/**
 * @internal
 */
export class FormErrorStateMatcher implements ErrorStateMatcher {
	isErrorState(control: UntypedFormControl | null, form: FormGroupDirective | NgForm | null): boolean {
		const isSubmitted = form && form.submitted;
		return !!(control && control.invalid && (control.dirty || control.touched || isSubmitted));
	}
}
