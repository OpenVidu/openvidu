import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { BackgroundEffect, EffectType } from '../../../models/background-effect.model';
import { PanelType } from '../../../models/panel.model';
import { PanelService } from '../../../services/panel/panel.service';
import { VirtualBackgroundService } from '../../../services/virtual-background/virtual-background.service';

@Component({
  selector: 'ov-background-effects-panel',
  templateUrl: './background-effects-panel.component.html',
  styleUrls: ['../panel.component.css','./background-effects-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BackgroundEffectsPanelComponent implements OnInit {

  backgroundSelectedId: string;
  effectType = EffectType;
  backgroundImages: BackgroundEffect[] = [];
  noEffectAndBlurredBackground: BackgroundEffect[] = [];
  private backgrounds: BackgroundEffect[];
  private backgroundSubs: Subscription;

  /**
   * @internal
   * @param panelService
   * @param backgroundService
   * @param cd
   */
  constructor(private panelService: PanelService, private backgroundService: VirtualBackgroundService, private cd: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.subscribeToBackgroundSelected();
    this.backgrounds = this.backgroundService.getBackgrounds();
    this.noEffectAndBlurredBackground = this.backgrounds.filter(f => f.type === EffectType.BLUR || f.type === EffectType.NONE);
    this.backgroundImages = this.backgrounds.filter(f => f.type === EffectType.IMAGE);
  }

  ngOnDestroy() {
    if (this.backgroundSubs) this.backgroundSubs.unsubscribe();
  }
  subscribeToBackgroundSelected() {
    this.backgroundSubs = this.backgroundService.backgroundSelectedObs.subscribe((id) => {
      this.backgroundSelectedId = id;
      this.cd.markForCheck();
    });
  }

  close() {
    this.panelService.togglePanel(PanelType.BACKGROUND_EFFECTS);
  }

  async applyBackground(effect: BackgroundEffect) {
    if (effect.type === EffectType.NONE) {
      await this.removeBackground();
    } else {
      await this.backgroundService.applyBackground(effect);
    }
  }

  async removeBackground() {
    await this.backgroundService.removeBackground();
  }
}
