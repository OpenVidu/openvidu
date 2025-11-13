import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ILogger } from '../../models/logger.model';
import { PanelStatusInfo, PanelSettingsOptions, PanelType } from '../../models/panel.model';
import { LoggerService } from '../logger/logger.service';

@Injectable({
	providedIn: 'root'
})
export class PanelService {
	/**
	 * Panel Observable which pushes the panel status in every update.
	 */
	panelStatusObs: Observable<PanelStatusInfo>;
	private log: ILogger;
	private isExternalOpened: boolean = false;
	private externalType: string = '';
	private _panelOpened = <BehaviorSubject<PanelStatusInfo>>new BehaviorSubject({ isOpened: false });
	private panelTypes: string[] = Object.values(PanelType);

	/**
	 * @internal
	 */
	constructor(private loggerSrv: LoggerService) {
		this.log = this.loggerSrv.get('PanelService');
		this.panelStatusObs = this._panelOpened.asObservable();
	}

	/**
	 * @internal
	 */
	clear() {
		this._panelOpened.next({ isOpened: false });
	}

	/**
	 * Open or close the panel type received. Calling this method with the panel opened and the same type panel, will close the panel.
	 * If the type is differente, it will switch to the properly panel.
	 */
	togglePanel(panelType: PanelType | string, subOptionType?: PanelSettingsOptions | string) {
		const previousState = this._panelOpened.getValue();
		const isDefaultPanel = this.panelTypes.includes(panelType);

		this.log.d(`Toggling ${isDefaultPanel ? panelType : 'external'} menu`);

		// Set the next panel state
		let nextOpenedValue: boolean;

		if (panelType === previousState.panelType) {
			// Same panel clicked, toggle it
			nextOpenedValue = !previousState.isOpened;
		} else {
			// Different panel clicked, always open it
			nextOpenedValue = true;
		}

		// Update external panel tracking
		if (isDefaultPanel) {
			this.isExternalOpened = false;
			this.externalType = '';
		} else {
			this.isExternalOpened = nextOpenedValue;
			this.externalType = nextOpenedValue ? panelType : '';
		}

		// Update the panel state
		this._panelOpened.next({
			isOpened: nextOpenedValue,
			panelType,
			subOptionType,
			previousPanelType: previousState.panelType
		});
	}

	/**
	 * @internal
	 */
	isPanelOpened(): boolean {
		return this._panelOpened.getValue().isOpened;
	}

	/**
	 * Closes the panel if it is opened.
	 */
	closePanel(): void {
		this._panelOpened.next({ isOpened: false, panelType: undefined, subOptionType: undefined, previousPanelType: undefined });
	}

	/**
	 * Whether the chat panel is opened or not.
	 */
	isChatPanelOpened(): boolean {
		const panelState = this._panelOpened.getValue();
		return panelState.isOpened && panelState.panelType === PanelType.CHAT;
	}

	/**
	 * Whether the participants panel is opened or not.
	 */
	isParticipantsPanelOpened(): boolean {
		const panelState = this._panelOpened.getValue();
		return panelState.isOpened && panelState.panelType === PanelType.PARTICIPANTS;
	}

	/**
	 * Whether the activities panel is opened or not.
	 */
	isActivitiesPanelOpened(): boolean {
		const panelState = this._panelOpened.getValue();
		return panelState.isOpened && panelState.panelType === PanelType.ACTIVITIES;
	}

	/**
	 * Whether the settings panel is opened or not.
	 */
	isSettingsPanelOpened(): boolean {
		const panelState = this._panelOpened.getValue();
		return panelState.isOpened && panelState.panelType === PanelType.SETTINGS;
	}

	/**
	 * Whether the background effects panel is opened or not.
	 */
	isBackgroundEffectsPanelOpened(): boolean {
		const panelState = this._panelOpened.getValue();
		return panelState.isOpened && panelState.panelType === PanelType.BACKGROUND_EFFECTS;
	}

	/**
	 * Returns whether the external panel (a panel adding by the final user) is opened or not.
	 */
	isExternalPanelOpened(): boolean {
		return this.isExternalOpened;
	}
}
