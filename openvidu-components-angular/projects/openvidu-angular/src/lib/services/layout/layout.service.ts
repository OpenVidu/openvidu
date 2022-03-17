import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { LayoutClass, OpenViduLayout, OpenViduLayoutOptions } from '../../models/layout.model';
import { DocumentService } from '../document/document.service';

@Injectable({
	providedIn: 'root'
})
export class LayoutService {
	layoutWidthObs: Observable<number>;
	private _layoutWidthObs: BehaviorSubject<number> = new BehaviorSubject(0);
	private openviduLayout: OpenViduLayout;
	private openviduLayoutOptions: OpenViduLayoutOptions;

	constructor(private documentService: DocumentService) {
		this.layoutWidthObs = this._layoutWidthObs.asObservable();
	}

	initialize(timeout: number = null) {
		if (typeof timeout === 'number' && timeout >= 0) {
			setTimeout(() => {
				this._initialize();
				this.sendLayoutWidthEvent();
			}, timeout);
		} else {
			this._initialize();
			this.sendLayoutWidthEvent();
		}
	}

	private _initialize() {
		this.openviduLayout = new OpenViduLayout();
		this.openviduLayoutOptions = this.getOptions();
		const element = document.getElementById('layout');
		this.openviduLayout.initLayoutContainer(element, this.openviduLayoutOptions);
	}

	private getOptions(): OpenViduLayoutOptions {
		const options = {
			maxRatio: 3 / 2, // The narrowest ratio that will be used (default 2x3)
			minRatio: 9 / 16, // The widest ratio that will be used (default 16x9)
			fixedRatio: false /* If this is true then the aspect ratio of the video is maintained
      and minRatio and maxRatio are ignored (default false) */,
			bigClass: LayoutClass.BIG_ELEMENT, // The class to add to elements that should be sized bigger
			smallClass: LayoutClass.SMALL_ELEMENT,
			bigPercentage: 0.7, // The maximum percentage of space the big ones should take up
			bigFixedRatio: false, // fixedRatio for the big ones
			bigMaxRatio: 9 / 16, // The narrowest ratio to use for the big elements (default 2x3)
			bigMinRatio: 9 / 16, // The widest ratio to use for the big elements (default 16x9)
			bigFirst: true, // Whether to place the big one in the top left (true) or bottom right
			animate: true // Whether you want to animate the transitions. Deprecated property, to disable it remove the transaction property on OT_publisher css class
		};
		return options;
	}

	update(timeout: number = null) {
		const updateAux = () => {
			if (!!this.openviduLayout) {
				this.openviduLayout.updateLayout();
				this.sendLayoutWidthEvent();
			}
		};
		if (typeof timeout === 'number' && timeout >= 0) {
			setTimeout(() => updateAux(), timeout);
		} else {
			updateAux();
		}
	}

	getLayout() {
		return this.openviduLayout;
	}

	clear() {
		this.openviduLayout = null;
	}

	private sendLayoutWidthEvent() {
		const sidenavLayoutElement = this.documentService.getHTMLElementByClassName(
			this.openviduLayout?.getLayoutContainer(),
			LayoutClass.SIDENAV_CONTAINER
		);
		if (sidenavLayoutElement && sidenavLayoutElement.clientWidth) {
			this._layoutWidthObs.next(sidenavLayoutElement.clientWidth);
		}
	}
}
