import { of } from 'rxjs';

export class TranslateServiceMock {
	instant(key: string): string {
		return key;
	}
	get(key: string) {
		return of(key);
	}
}
