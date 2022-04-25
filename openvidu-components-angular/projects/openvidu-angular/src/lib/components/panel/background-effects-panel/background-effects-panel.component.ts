import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { PanelType } from '../../../models/panel.model';
import { PanelService } from '../../../services/panel/panel.service';

@Component({
  selector: 'ov-background-effects-panel',
  templateUrl: './background-effects-panel.component.html',
  styleUrls: ['./background-effects-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BackgroundEffectsPanelComponent implements OnInit {

  effectActive: string;

  constructor(private panelService: PanelService) { }

  ngOnInit(): void {
  }

  close() {
		this.panelService.togglePanel(PanelType.BACKGROUND_EFFECTS);
	}

}
