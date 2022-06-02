import { Pipe, PipeTransform } from '@angular/core';

/**
 * @internal
 */
@Pipe({
	name: 'duration'
})
export class DurationFromSecondsPipe implements PipeTransform {
	transform(durationInSeconds: number): string {
		if (durationInSeconds < 60) {
			return Math.floor(durationInSeconds) + 's';
		} else if (durationInSeconds < 3600) {
			return Math.floor(durationInSeconds / 60) + 'm ' + Math.floor(durationInSeconds % 60) + 's';
		} else {
			const hours = Math.floor(durationInSeconds / 3600);
			const minutes = Math.floor((durationInSeconds - hours * 3600) / 60);
			return hours + 'h ' + minutes + 'm';
		}
	}
}
