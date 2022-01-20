import { TestBed } from '@angular/core/testing';
import { LoggerService } from '../logger/logger.service';
import { LoggerServiceMock } from '../logger/logger.service.mock';

import { StorageService } from './storage.service';

describe('StorageService', () => {
	let service: StorageService;
	const key = 'key';
	const item = 'item';
	let store = {};
	let spyStoreGetItem;
	let spyStoreSetItem;
	let spyStoreClear;

	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [{ provide: LoggerService, useClass: LoggerServiceMock }] });
		service = TestBed.inject(StorageService);
		spyStoreGetItem = spyOn(window.localStorage, 'getItem').and.callFake((keyFake) => {
			return store[keyFake] || '{}';
		});
		spyStoreSetItem = spyOn(window.localStorage, 'setItem').and.callFake((keyFake, value) => {
			store[keyFake] = value;
		});
		spyStoreClear = spyOn(window.localStorage, 'clear').and.callFake(() => {
			store = {};
		});
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
	it('should be created', () => {
		expect(service).toBeTruthy();
	});

	it('should set an item', () => {
		const spyServiceSet = spyOn(service, 'set').and.callThrough();

		service.set(key, item);

		expect(spyServiceSet).toHaveBeenCalledWith(key, item);
	});

	it('should get an item added', () => {
		const spyServiceSet = spyOn(service, 'set').and.callThrough();
		const spyServiceGet = spyOn(service, 'get').and.callThrough();

		service.set(key, item);
		expect(spyServiceSet).toHaveBeenCalledWith(key, item);

		const value = service.get(key);
		expect(spyServiceGet).toHaveBeenCalledWith(key);
		expect(value).toEqual(item);
	});

	it('should clear local storage', () => {
		const spyServiceSet = spyOn(service, 'set').and.callThrough();
		const spyServiceGet = spyOn(service, 'get').and.callThrough();
		const spyServiceClear = spyOn(service, 'clear').and.callThrough();

		service.set(key, item);
		expect(spyServiceSet).toHaveBeenCalledWith(key, item);

		let value = service.get(key);
		expect(spyServiceGet).toHaveBeenCalledWith(key);
		expect(value).toEqual(item);
		service.clear();
		expect(spyServiceClear).toHaveBeenCalled();
		value = service.get(key);
		expect(value).toEqual(null);
	});
});
