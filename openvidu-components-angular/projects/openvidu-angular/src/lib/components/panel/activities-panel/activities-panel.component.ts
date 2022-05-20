import { Component, OnInit } from '@angular/core';
import { PanelType } from '../../../models/panel.model';
import { PanelService } from '../../../services/panel/panel.service';

/**
 * @internal
 */
@Component({
	selector: 'ov-activities-panel',
	templateUrl: './activities-panel.component.html',
	styleUrls: ['../panel.component.css','./activities-panel.component.css']
})
export class ActivitiesPanelComponent implements OnInit {
	constructor(private panelService: PanelService) {}

	ngOnInit(): void {}

	ngOnDestroy() {}

	close() {
		this.panelService.togglePanel(PanelType.ACTIVITIES);
	}
}
