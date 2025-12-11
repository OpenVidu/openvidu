import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, Validators, FormGroup, FormBuilder } from '@angular/forms';
import { AppMaterialModule } from '../../openvidu-components-angular.material.module';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { Subscription } from 'rxjs';
import { ActionService } from '../../services/action/action.service';
import { OpenViduComponentsConfigService } from '../../services/config/directive-config.service';

@Component({
	selector: 'ov-admin-login',
	templateUrl: './admin-login.component.html',
	styleUrls: ['./admin-login.component.scss'],
	standalone: true,
	imports: [CommonModule, ReactiveFormsModule, AppMaterialModule, TranslatePipe]
})
export class AdminLoginComponent implements OnInit {
	/**
	 * Provides event notifications that fire when login button has been clicked.
	 * The event will contain the credentials value.
	 * @returns {EventEmitter<{ username: string; password: string }>}
	 */
	@Output() onLoginRequested: EventEmitter<{ username: string; password: string }> = new EventEmitter<{
		username: string;
		password: string;
	}>();

	/**
	 * @internal
	 */
	title: string;

	/**
	 * @internal
	 */
	loading = false;

	/**
	 * @internal
	 */
	showSpinner = false;

	/**
	 * @internal
	 */
	loginForm: FormGroup;

	private errorSub: Subscription;
	private titleSub: Subscription;

	/**
	 * @internal
	 */
	constructor(
		private libService: OpenViduComponentsConfigService,
		private actionService: ActionService,
		private fb: FormBuilder
	) {
		this.loginForm = this.fb.group({
			username: ['', [Validators.required, Validators.minLength(4)]],
			password: ['', [Validators.required, Validators.minLength(4)]]
		});
	}

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
		if (this.titleSub) this.titleSub.unsubscribe();
	}

	/**
	 * @internal
	 */
	login() {
		if (this.loginForm.invalid) return;
		this.showSpinner = true;
		this.onLoginRequested.emit(this.loginForm.value);
	}

	private subscribeToAdminLoginDirectives() {
		this.errorSub = this.libService.adminLoginError$.subscribe((value) => {
			const errorExists = !!value;
			if (errorExists) {
				this.showSpinner = false;
				this.actionService.openDialog(value.error, value.message, true);
			}
		});

		this.titleSub = this.libService.adminLoginTitle$.subscribe((value) => {
			this.title = value;
		});
	}
}
