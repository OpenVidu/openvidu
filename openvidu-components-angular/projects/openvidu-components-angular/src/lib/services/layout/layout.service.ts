import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { LayoutAlignment, LayoutClass, OpenViduLayout, OpenViduLayoutOptions } from '../../models/layout.model';
import { ILogger } from '../../models/logger.model';
import { LoggerService } from '../logger/logger.service';

/**
 * @internal
 */
@Injectable({
	providedIn: 'root'
})
export class LayoutService {
	layoutContainer: HTMLElement | undefined = undefined;
	layoutWidthObs: Observable<number>;
	captionsTogglingObs: Observable<boolean>;
	protected layoutWidth: BehaviorSubject<number> = new BehaviorSubject(0);
	protected openviduLayout: OpenViduLayout | undefined;
	protected openviduLayoutOptions: OpenViduLayoutOptions;
	protected captionsToggling: BehaviorSubject<boolean> = new BehaviorSubject(false);
	protected log: ILogger;

	constructor(protected loggerSrv: LoggerService) {
		this.layoutWidthObs = this.layoutWidth.asObservable();
		this.captionsTogglingObs = this.captionsToggling.asObservable();
		this.log = this.loggerSrv.get('LayoutService');
	}

	initialize(container: HTMLElement) {
		this.layoutContainer = container;
		this.openviduLayout = new OpenViduLayout();
		this.openviduLayoutOptions = this.getOptions();
		if (this.layoutContainer) {
			this.openviduLayout.initLayoutContainer(this.layoutContainer, this.openviduLayoutOptions);
		}
		this.sendLayoutWidthEvent();
	}

	toggleCaptions() {
		this.captionsToggling.next(!this.captionsToggling.getValue());
	}

	update(timeout: number | undefined = undefined) {
		const updateAux = () => {
			if (this.openviduLayout && this.layoutContainer) {
				this.openviduLayout.updateLayout(this.layoutContainer, this.openviduLayoutOptions);
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
		this.openviduLayout = undefined;
	}

	protected getOptions(): OpenViduLayoutOptions {
		const options = {
			maxRatio: 3 / 2, // The narrowest ratio that will be used (default 2x3)
			minRatio: 9 / 16, // The widest ratio that will be used (default 16x9)
			fixedRatio: false /* If this is true then the aspect ratio of the video is maintained
      and minRatio and maxRatio are ignored (default false) */,
			bigClass: LayoutClass.BIG_ELEMENT, // The class to add to elements that should be sized bigger
			smallClass: LayoutClass.SMALL_ELEMENT,
			ignoredClass: LayoutClass.IGNORED_ELEMENT,
			bigPercentage: 0.8, // The maximum percentage of space the big ones should take up
			minBigPercentage: 0, // If this is set then it will scale down the big space if there is left over whitespace down to this minimum size
			bigFixedRatio: false, // fixedRatio for the big ones
			bigMaxRatio: 9 / 16, // The narrowest ratio to use for the big elements (default 2x3)
			bigMinRatio: 9 / 16, // The widest ratio to use for the big elements (default 16x9)
			bigFirst: true, // Whether to place the big one in the top left (true) or bottom right
			animate: true, // Whether you want to animate the transitions. Deprecated property, to disable it remove the transaction property on OV_publisher css class
			alignItems: LayoutAlignment.CENTER,
			bigAlignItems: LayoutAlignment.CENTER,
			smallAlignItems: LayoutAlignment.CENTER,
			maxWidth: Infinity, // The maximum width of the elements
			maxHeight: Infinity, // The maximum height of the elements
			smallMaxWidth: Infinity,
			smallMaxHeight: Infinity,
			bigMaxWidth: Infinity,
			bigMaxHeight: Infinity,
			scaleLastRow: true,
			bigScaleLastRow: true
		};
		return options;
	}

	protected sendLayoutWidthEvent() {
		const layoutContainer = this.openviduLayout?.getLayoutContainer();
		if (!layoutContainer) {
			this.log.e('Layout container not found. Cannot send layout width event');
			return;
		}
		const sidenavLayoutElement = this.getHTMLElementByClassName(layoutContainer, LayoutClass.SIDENAV_CONTAINER);
		if (sidenavLayoutElement && sidenavLayoutElement.clientWidth) {
			this.layoutWidth.next(sidenavLayoutElement.clientWidth);
		}
	}

	protected getHTMLElementByClassName(element: HTMLElement | null, className: string): HTMLElement | null {
		while (!!element && element !== document.body) {
			if (element.className.includes(className)) {
				return element;
			}
			element = element.parentElement;
		}
		return null;
	}
}
