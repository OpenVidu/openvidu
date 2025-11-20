import { Injectable, effect } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { LayoutAlignment, LayoutClass, OpenViduLayout, OpenViduLayoutOptions } from '../../models/layout.model';
import { ILogger } from '../../models/logger.model';
import { LoggerService } from '../logger/logger.service';
import { ViewportService } from '../viewport/viewport.service';

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
	protected openviduLayoutOptions!: OpenViduLayoutOptions;
	protected captionsToggling: BehaviorSubject<boolean> = new BehaviorSubject(false);
	protected log: ILogger;

	constructor(
		protected loggerSrv: LoggerService,
		protected viewportSrv: ViewportService
	) {
		this.layoutWidthObs = this.layoutWidth.asObservable();
		this.captionsTogglingObs = this.captionsToggling.asObservable();
		this.log = this.loggerSrv.get('LayoutService');
		this.openviduLayoutOptions = this.getOptions();
		this.setupViewportListener();
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
				this.openviduLayoutOptions = this.getOptions();
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

	updateResponsive() {
		this.updateLayoutOptions();
	}

	getLayout() {
		return this.openviduLayout;
	}

	clear() {
		this.openviduLayout = undefined;
	}

	/**
	 * Get layout options adjusted to the current viewport
	 * @returns Layout options adjusted to the current viewport
	 */
	protected getOptions(): OpenViduLayoutOptions {
		const ratios = this.getResponsiveRatios();
		const percentages = this.getResponsivePercentages();
		const isMobile = this.viewportSrv.isMobile();

		return {
			maxRatio: ratios.maxRatio,
			minRatio: ratios.minRatio,
			fixedRatio: false,
			bigClass: LayoutClass.BIG_ELEMENT,
			smallClass: LayoutClass.SMALL_ELEMENT,
			ignoredClass: LayoutClass.IGNORED_ELEMENT,
			bigPercentage: percentages.bigPercentage,
			minBigPercentage: percentages.minBigPercentage,
			bigFixedRatio: false,
			bigMaxRatio: ratios.bigMaxRatio,
			bigMinRatio: ratios.bigMinRatio,
			bigFirst: true,
			// Disable animations on mobile for better performance
			animate: !isMobile,
			alignItems: LayoutAlignment.CENTER,
			bigAlignItems: LayoutAlignment.CENTER,
			smallAlignItems: LayoutAlignment.CENTER,
			maxWidth: Infinity,
			maxHeight: Infinity,
			smallMaxWidth: Infinity,
			smallMaxHeight: Infinity,
			bigMaxWidth: Infinity,
			bigMaxHeight: Infinity,
			scaleLastRow: true,
			bigScaleLastRow: false
		};
	}

	protected getResponsiveRatios() {
		const isMobile = this.viewportSrv.isMobile();
		const isTablet = this.viewportSrv.isTablet();
		const isPortrait = this.viewportSrv.isPortrait();

		if (isMobile && isPortrait) {
			return {
				maxRatio: 5 / 4,
				minRatio: 4 / 5,
				bigMaxRatio: 5 / 4,
				bigMinRatio: 3 / 4
			};
		}

		if (isMobile) {
			return {
				maxRatio: 16 / 9,
				minRatio: 3 / 4,
				bigMaxRatio: 16 / 9,
				bigMinRatio: 4 / 3
			};
		}

		if (isTablet && isPortrait) {
			return {
				maxRatio: 4 / 3,
				minRatio: 3 / 5,
				bigMaxRatio: 4 / 3,
				bigMinRatio: 9 / 16
			};
		}

		if (isTablet) {
			return {
				maxRatio: 16 / 9,
				minRatio: 2 / 3,
				bigMaxRatio: 16 / 9,
				bigMinRatio: 9 / 16
			};
		}

		return {
			maxRatio: 16 / 9,
			minRatio: 9 / 16,
			bigMaxRatio: 16 / 9,
			bigMinRatio: 9 / 16
		};
	}

	protected getResponsivePercentages() {
		const isMobile = this.viewportSrv.isMobile();
		const isTablet = this.viewportSrv.isTablet();
		const isPortrait = this.viewportSrv.isPortrait();

		if (isMobile && isPortrait) {
			return {
				bigPercentage: 0.85,
				minBigPercentage: 0.7
			};
		}

		if (isMobile) {
			return {
				bigPercentage: 0.82,
				minBigPercentage: 0.65
			};
		}

		if (isTablet && isPortrait) {
			return {
				bigPercentage: 0.83,
				minBigPercentage: 0.6
			};
		}

		if (isTablet) {
			return {
				bigPercentage: 0.81,
				minBigPercentage: 0.55
			};
		}

		return {
			bigPercentage: 0.8,
			minBigPercentage: 0.5
		};
	}

	protected setupViewportListener(): void {
		effect(() => {
			const viewportInfo = this.viewportSrv.viewportInfo();
			const isMobile = this.viewportSrv.isMobile();
			const orientation = this.viewportSrv.orientation();
			this.updateLayoutOptions();
		});
	}

	protected updateLayoutOptions(): void {
		const newOptions = this.getOptions();

		if (this.hasSignificantChanges(this.openviduLayoutOptions, newOptions)) {
			this.openviduLayoutOptions = newOptions;

			if (this.openviduLayout && this.layoutContainer) {
				this.openviduLayout.updateLayout(this.layoutContainer, this.openviduLayoutOptions);
				this.sendLayoutWidthEvent();
			}
		}
	}

	protected hasSignificantChanges(oldOptions: OpenViduLayoutOptions, newOptions: OpenViduLayoutOptions): boolean {
		if (!oldOptions) return true;

		const significantProps: (keyof OpenViduLayoutOptions)[] = [
			'maxRatio',
			'minRatio',
			'bigMaxRatio',
			'bigMinRatio',
			'bigPercentage',
			'alignItems',
			'bigAlignItems'
		];

		return significantProps.some(
			(prop) => Math.abs((oldOptions[prop] as number) - (newOptions[prop] as number)) > 0.01 || oldOptions[prop] !== newOptions[prop]
		);
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
