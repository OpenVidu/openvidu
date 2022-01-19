import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RemoteUserService, LocalUserService, WebrtcService } from '../../../public-api';
import { CdkOverlayService } from '../../services/cdk-overlay/cdk-overlay.service';
import { DocumentService } from '../../services/document/document.service';
import { CdkOverlayServiceMock } from '../../services/cdk-overlay/cdk-overlay.service.mock';

import { DocumentServiceMock } from '../../services/document/document.service.mock';
import { LayoutService } from '../../services/layout/layout.service';
import { LocalUserServiceMock } from '../../services/local-user/local-user.service.mock';
import { LayoutServiceMock } from '../../services/layout/layout.service.mock';

import { RemoteUserServiceMock } from '../../services/remote-user/remote-user.service.mock';
import { StorageService } from '../../services/storage/storage.service';

import { StorageServiceMock } from '../../services/storage/storage.service.mock';

import { WebrtcServiceMock } from '../../services/webrtc/webrtc.service.mock';

import { ParticipantComponent } from './participant.component';

describe('ParticipantComponent', () => {
	let component: ParticipantComponent;
	let fixture: ComponentFixture<ParticipantComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [ParticipantComponent],
			providers: [
				{ provide: DocumentService, useClass: DocumentServiceMock },
				{ provide: StorageService, useClass: StorageServiceMock },
				{ provide: RemoteUserService, useClass: RemoteUserServiceMock },
				{ provide: LocalUserService, useClass: LocalUserServiceMock },
				{ provide: WebrtcService, useClass: WebrtcServiceMock },
				{ provide: CdkOverlayService, useClass: CdkOverlayServiceMock },
        { provide: LayoutService, useClass: LayoutServiceMock }
			]
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(ParticipantComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
