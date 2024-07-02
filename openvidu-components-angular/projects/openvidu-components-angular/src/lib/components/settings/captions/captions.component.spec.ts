import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CaptionsSettingComponent } from './captions.component';

describe('CaptionsSettingComponent', () => {
	let component: CaptionsSettingComponent;
	let fixture: ComponentFixture<CaptionsSettingComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [CaptionsSettingComponent]
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(CaptionsSettingComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
