import { Injectable } from '@angular/core';

@Injectable()
export class LoggerServiceMock {
	constructor() {}

	get(prefix: string) {
		return {
			d: () => {},
			w: () => {},
			e: () => {}
		};
	}
}
