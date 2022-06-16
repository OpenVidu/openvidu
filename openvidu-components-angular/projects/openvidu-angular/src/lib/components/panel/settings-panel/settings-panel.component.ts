import { Component, HostListener, OnInit } from '@angular/core';
import { MatOptionSelectionChange } from '@angular/material/core';
import { PanelType } from '../../../models/panel.model';
import { PanelService } from '../../../services/panel/panel.service';

@Component({
	selector: 'ov-settings-panel',
	templateUrl: './settings-panel.component.html',
	styleUrls: ['../panel.component.css', './settings-panel.component.css']
})
export class SettingsPanelComponent implements OnInit {

	selectedOption: string;
	constructor(private panelService: PanelService) {}
	ngOnInit() {}

	close() {
		this.panelService.togglePanel(PanelType.SETTINGS);
	}
}
