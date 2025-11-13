import { DocumentService } from './document.service';
import { LayoutClass } from '../../models/layout.model';

describe('DocumentService', () => {
	let service: DocumentService;

	beforeEach(() => {
		service = new DocumentService();
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});

	describe('isSmallElement', () => {
		it('should return true if element has SMALL_ELEMENT class', () => {
			const element = document.createElement('div');
			element.className = LayoutClass.SMALL_ELEMENT;
			expect(service.isSmallElement(element)).toBeTruthy();
		});

		it('should return false if element does not have SMALL_ELEMENT class', () => {
			const element = document.createElement('div');
			element.className = 'other-class';
			expect(service.isSmallElement(element)).toBeFalsy();
		});

		it('should return false if element is null', () => {
			expect(service.isSmallElement(null as any)).toBeFalsy();
		});

		it('should return true if element has SMALL_ELEMENT class combined with other classes', () => {
			const element = document.createElement('div');
			element.className = `some-class ${LayoutClass.SMALL_ELEMENT} another-class`;
			expect(service.isSmallElement(element)).toBeTruthy();
		});

		it('should return true if SMALL_ELEMENT is at the beginning of className', () => {
			const element = document.createElement('div');
			element.className = `${LayoutClass.SMALL_ELEMENT} another-class`;
			expect(service.isSmallElement(element)).toBeTruthy();
		});

		it('should return true if SMALL_ELEMENT is at the end of className', () => {
			const element = document.createElement('div');
			element.className = `some-class ${LayoutClass.SMALL_ELEMENT}`;
			expect(service.isSmallElement(element)).toBeTruthy();
		});
	});

	describe('toggleFullscreen', () => {
		let mockDocument: any;
		let mockElement: any;

		beforeEach(() => {
			mockElement = {
				requestFullscreen: jasmine.createSpy('requestFullscreen'),
				msRequestFullscreen: jasmine.createSpy('msRequestFullscreen'),
				mozRequestFullScreen: jasmine.createSpy('mozRequestFullScreen'),
				webkitRequestFullscreen: jasmine.createSpy('webkitRequestFullscreen')
			};

			mockDocument = {
				fullscreenElement: null,
				mozFullScreenElement: null,
				webkitFullscreenElement: null,
				msFullscreenElement: null,
				exitFullscreen: jasmine.createSpy('exitFullscreen'),
				msExitFullscreen: jasmine.createSpy('msExitFullscreen'),
				mozCancelFullScreen: jasmine.createSpy('mozCancelFullScreen'),
				webkitExitFullscreen: jasmine.createSpy('webkitExitFullscreen')
			};

			spyOn<any>(service, 'getDocument').and.returnValue(mockDocument);
			spyOn<any>(service, 'getElementById').and.returnValue(mockElement);
		});

		it('should request fullscreen when not in fullscreen mode', () => {
			spyOn<any>(service, 'isInFullscreen').and.returnValue(false);
			const requestSpy = spyOn<any>(service, 'requestFullscreen');

			service.toggleFullscreen('test-element');

			expect(service['getElementById']).toHaveBeenCalledWith('test-element');
			expect(requestSpy).toHaveBeenCalledWith(mockElement);
		});

		it('should exit fullscreen when in fullscreen mode', () => {
			spyOn<any>(service, 'isInFullscreen').and.returnValue(true);
			const exitSpy = spyOn<any>(service, 'exitFullscreen');

			service.toggleFullscreen('test-element');

			expect(exitSpy).toHaveBeenCalledWith(mockDocument);
		});
	});

	describe('isInFullscreen', () => {
		it('should return false when no fullscreen element', () => {
			const mockDocument = {
				fullscreenElement: null,
				mozFullScreenElement: null,
				webkitFullscreenElement: null,
				msFullscreenElement: null
			};
			spyOn<any>(service, 'getDocument').and.returnValue(mockDocument);

			expect(service['isInFullscreen']()).toBeFalse();
		});

		it('should return true when fullscreenElement is set', () => {
			const mockElement = document.createElement('div');
			const mockDocument = {
				fullscreenElement: mockElement,
				mozFullScreenElement: null,
				webkitFullscreenElement: null,
				msFullscreenElement: null
			};
			spyOn<any>(service, 'getDocument').and.returnValue(mockDocument);

			expect(service['isInFullscreen']()).toBeTrue();
		});

		it('should return true when mozFullScreenElement is set', () => {
			const mockElement = document.createElement('div');
			const mockDocument = {
				fullscreenElement: null,
				mozFullScreenElement: mockElement,
				webkitFullscreenElement: null,
				msFullscreenElement: null
			};
			spyOn<any>(service, 'getDocument').and.returnValue(mockDocument);

			expect(service['isInFullscreen']()).toBeTrue();
		});

		it('should return true when webkitFullscreenElement is set', () => {
			const mockElement = document.createElement('div');
			const mockDocument = {
				fullscreenElement: null,
				mozFullScreenElement: null,
				webkitFullscreenElement: mockElement,
				msFullscreenElement: null
			};
			spyOn<any>(service, 'getDocument').and.returnValue(mockDocument);

			expect(service['isInFullscreen']()).toBeTrue();
		});

		it('should return true when msFullscreenElement is set', () => {
			const mockElement = document.createElement('div');
			const mockDocument = {
				fullscreenElement: null,
				mozFullScreenElement: null,
				webkitFullscreenElement: null,
				msFullscreenElement: mockElement
			};
			spyOn<any>(service, 'getDocument').and.returnValue(mockDocument);

			expect(service['isInFullscreen']()).toBeTrue();
		});
	});

	describe('requestFullscreen', () => {
		it('should call requestFullscreen when available', () => {
			const mockElement = {
				requestFullscreen: jasmine.createSpy('requestFullscreen')
			};

			service['requestFullscreen'](mockElement);

			expect(mockElement.requestFullscreen).toHaveBeenCalled();
		});

		it('should call msRequestFullscreen when requestFullscreen not available', () => {
			const mockElement = {
				requestFullscreen: undefined,
				msRequestFullscreen: jasmine.createSpy('msRequestFullscreen')
			};

			service['requestFullscreen'](mockElement);

			expect(mockElement.msRequestFullscreen).toHaveBeenCalled();
		});

		it('should call mozRequestFullScreen when standard methods not available', () => {
			const mockElement = {
				requestFullscreen: undefined,
				msRequestFullscreen: undefined,
				mozRequestFullScreen: jasmine.createSpy('mozRequestFullScreen')
			};

			service['requestFullscreen'](mockElement);

			expect(mockElement.mozRequestFullScreen).toHaveBeenCalled();
		});

		it('should call webkitRequestFullscreen when other methods not available', () => {
			const mockElement = {
				requestFullscreen: undefined,
				msRequestFullscreen: undefined,
				mozRequestFullScreen: undefined,
				webkitRequestFullscreen: jasmine.createSpy('webkitRequestFullscreen')
			};

			service['requestFullscreen'](mockElement);

			expect(mockElement.webkitRequestFullscreen).toHaveBeenCalled();
		});

		it('should handle null element gracefully', () => {
			expect(() => service['requestFullscreen'](null)).not.toThrow();
		});

		it('should handle undefined element gracefully', () => {
			expect(() => service['requestFullscreen'](undefined)).not.toThrow();
		});
	});

	describe('exitFullscreen', () => {
		it('should call exitFullscreen when available', () => {
			const mockDocument = {
				exitFullscreen: jasmine.createSpy('exitFullscreen')
			};

			service['exitFullscreen'](mockDocument);

			expect(mockDocument.exitFullscreen).toHaveBeenCalled();
		});

		it('should call msExitFullscreen when exitFullscreen not available', () => {
			const mockDocument = {
				exitFullscreen: undefined,
				msExitFullscreen: jasmine.createSpy('msExitFullscreen')
			};

			service['exitFullscreen'](mockDocument);

			expect(mockDocument.msExitFullscreen).toHaveBeenCalled();
		});

		it('should call mozCancelFullScreen when standard methods not available', () => {
			const mockDocument = {
				exitFullscreen: undefined,
				msExitFullscreen: undefined,
				mozCancelFullScreen: jasmine.createSpy('mozCancelFullScreen')
			};

			service['exitFullscreen'](mockDocument);

			expect(mockDocument.mozCancelFullScreen).toHaveBeenCalled();
		});

		it('should call webkitExitFullscreen when other methods not available', () => {
			const mockDocument = {
				exitFullscreen: undefined,
				msExitFullscreen: undefined,
				mozCancelFullScreen: undefined,
				webkitExitFullscreen: jasmine.createSpy('webkitExitFullscreen')
			};

			service['exitFullscreen'](mockDocument);

			expect(mockDocument.webkitExitFullscreen).toHaveBeenCalled();
		});

		it('should handle null document gracefully', () => {
			expect(() => service['exitFullscreen'](null)).not.toThrow();
		});

		it('should handle undefined document gracefully', () => {
			expect(() => service['exitFullscreen'](undefined)).not.toThrow();
		});
	});

	describe('getDocument and getElementById', () => {
		it('should return window.document by default', () => {
			const doc = service['getDocument']();
			expect(doc).toBe(window.document);
		});

		it('should return element from document', () => {
			const testElement = document.createElement('div');
			testElement.id = 'test-element-id';
			document.body.appendChild(testElement);

			const element = service['getElementById']('test-element-id');

			expect(element).toBe(testElement);
			document.body.removeChild(testElement);
		});
	});
});


