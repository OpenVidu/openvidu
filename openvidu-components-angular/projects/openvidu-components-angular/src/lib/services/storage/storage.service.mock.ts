import { Injectable } from '@angular/core';

@Injectable()
export class StorageServiceMock {
	store = {};

	constructor() {}

	public set(key: string, item: any) {
		this.store[key] = item;
	}
	public get(key: string): any {
		return this.store[key] || '{}';
	}
	public clear() {
		this.store = {};
	}
}
