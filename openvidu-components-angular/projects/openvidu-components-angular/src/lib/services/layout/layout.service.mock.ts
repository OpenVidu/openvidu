import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { LayoutClass, OpenViduLayout, OpenViduLayoutOptions } from '../../models/layout.model';
import { DocumentService } from '../document/document.service';

@Injectable({
	providedIn: 'root'
})
export class LayoutServiceMock {
	layoutWidthObs: Observable<number>;
	private _layoutWidthObs: BehaviorSubject<number> = new BehaviorSubject(0);
	private openviduLayout: OpenViduLayout;
	private openviduLayoutOptions: OpenViduLayoutOptions;

	constructor() {}

	initialize(timeout: number = null) {}

	private _initialize() {}

	getOptions(): OpenViduLayoutOptions {
		return null;
	}

	update(timeout?: number) {}

	getLayout() {
		return this.openviduLayout;
	}

	clear() {
		this.openviduLayout = null;
	}

	private sendLayoutWidthEvent() {}
}
