import { TestBed } from '@angular/core/testing';
import { PanelService } from './panel.service';
import { LoggerService } from '../logger/logger.service';
import { PanelType, PanelSettingsOptions } from '../../models/panel.model';
import { PanelStatusInfo } from '../../models/panel.model';
import { LoggerServiceMock } from '../../../test-helpers/mocks';

describe('PanelService', () => {
  let service: PanelService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PanelService,
        { provide: LoggerService, useClass: LoggerServiceMock }
      ]
    });
    service = TestBed.inject(PanelService);
  });

  it('should be created and initially closed', () => {
    expect(service).toBeTruthy();
    expect(service.isPanelOpened()).toBeFalse();
  });

  it('panelStatusObs emits initial value and after toggle opens the CHAT panel', () => {
    const emissions: PanelStatusInfo[] = [];
    const sub = service.panelStatusObs.subscribe(v => emissions.push(v));

    // initial emission
    expect(emissions.length).toBe(1);
    expect(emissions[0].isOpened).toBeFalse();

    // open chat
    service.togglePanel(PanelType.CHAT);
    expect(service.isPanelOpened()).toBeTrue();
    expect(service.isChatPanelOpened()).toBeTrue();

    // verify an emission was pushed and panelType is CHAT
    const last = emissions[emissions.length - 1];
    expect(last.isOpened).toBeTrue();
    expect(last.panelType).toBe(PanelType.CHAT);

    sub.unsubscribe();
  });

  it('toggling same panel closes it and toggling different panel sets previousPanelType', () => {
    const emissions: PanelStatusInfo[] = [];
    const sub = service.panelStatusObs.subscribe(v => emissions.push(v));

    service.togglePanel(PanelType.PARTICIPANTS);
    expect(service.isParticipantsPanelOpened()).toBeTrue();

    // toggling same panel should close it
    service.togglePanel(PanelType.PARTICIPANTS);
    expect(service.isPanelOpened()).toBeFalse();

    // open panel A then open panel B -> previousPanelType should be A
    service.togglePanel(PanelType.ACTIVITIES);
    expect(service.isActivitiesPanelOpened()).toBeTrue();
    service.togglePanel(PanelType.SETTINGS);
    expect(service.isSettingsPanelOpened()).toBeTrue();

    const last = emissions[emissions.length - 1];
    expect(last.previousPanelType).toBe(PanelType.ACTIVITIES);

    sub.unsubscribe();
  });

  it('supports external panels and subOptionType', () => {
    const externalName = 'MY_EXTERNAL_PANEL';
    const subOpt: PanelSettingsOptions | string = 'SOME_OPTION';

    // open external
    service.togglePanel(externalName, subOpt);
    expect(service.isExternalPanelOpened()).toBeTrue();

    // panelStatusObs should contain the external panel type and subOptionType
    const emitted = [] as PanelStatusInfo[];
    const s = service.panelStatusObs.subscribe(v => emitted.push(v));
    // last pushed value
    const last = emitted[emitted.length - 1];
    expect(last.panelType).toBe(externalName);
    expect(last.subOptionType).toBe(subOpt);

    // toggling the same external panel closes it
    service.togglePanel(externalName);
    expect(service.isExternalPanelOpened()).toBeFalse();

    s.unsubscribe();
  });

  it('opens and closes the background effects panel correctly', () => {
    // Open background effects
    service.togglePanel(PanelType.BACKGROUND_EFFECTS);
    expect(service.isBackgroundEffectsPanelOpened()).toBeTrue();

    // Verify panelStatusObs last emission has correct panelType
    const emitted = [] as any[];
    const sub = service.panelStatusObs.subscribe(v => emitted.push(v));
    const last = emitted[emitted.length - 1];
    expect(last.panelType).toBe(PanelType.BACKGROUND_EFFECTS);

    // Close it
    service.togglePanel(PanelType.BACKGROUND_EFFECTS);
    expect(service.isBackgroundEffectsPanelOpened()).toBeFalse();

    sub.unsubscribe();
  });

  it('closePanel and clear close the panel and reset state', () => {
    service.togglePanel(PanelType.CHAT);
    expect(service.isPanelOpened()).toBeTrue();

    service.closePanel();
    expect(service.isPanelOpened()).toBeFalse();

    // open again and then clear
    service.togglePanel(PanelType.CHAT);
    expect(service.isPanelOpened()).toBeTrue();
    service.clear();
    expect(service.isPanelOpened()).toBeFalse();
  });
});
