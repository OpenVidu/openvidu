import { TestBed } from '@angular/core/testing';
import { CdkOverlayContainer } from '../../config/custom-cdk-overlay';

import { CdkOverlayService } from './cdk-overlay.service';


export class CdkOverlayContainerMock {
	protected _createContainer(): void {}

	setSelector(selector: string) {}
	private getElement(selector: string): Element {
		return null;
	}
}

describe('CdkOverlayService', () => {
  let service: CdkOverlayService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: CdkOverlayContainer, useClass: CdkOverlayContainerMock }]
    });
    service = TestBed.inject(CdkOverlayService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
