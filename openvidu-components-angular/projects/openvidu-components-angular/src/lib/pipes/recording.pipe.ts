import { Pipe, PipeTransform } from '@angular/core';

/**
 * @internal
 */
@Pipe({
	name: 'duration',
	standalone: true
})
export class DurationFromSecondsPipe implements PipeTransform {
	transform(durationInSeconds: number): string {
		if (durationInSeconds < 60) {
			return `${Math.floor(durationInSeconds)}s`;
		} else if (durationInSeconds < 3600) {
			const minutes = Math.floor(durationInSeconds / 60);
			const seconds = Math.floor(durationInSeconds % 60);
			return `${minutes}m ${seconds}s`;
		} else {
			const hours = Math.floor(durationInSeconds / 3600);
			const minutes = Math.floor((durationInSeconds - hours * 3600) / 60);
			return `${hours}h ${minutes}m`;
		}
	}
}

/**
 * @internal
 */
@Pipe({
	name: 'searchByStringProperty',
	standalone: true
})
export class SearchByStringPropertyPipe implements PipeTransform {
	transform(items: any[], props: { properties: string[]; filter: string }): any {
		if (!items || !props || props.properties.length === 0 || !props.filter) {
			return items;
		}
		return items.filter((item) => {
			return props.properties.some((prop) => {
				const multipleProps = prop.split('.');
				let recursiveProp = item;
				try {
					multipleProps.forEach((p) => {
						recursiveProp = recursiveProp[p];
						if (recursiveProp === null || recursiveProp === undefined) {
							throw new Error('Property not found');
						}
					});
				} catch (error) {
					return false;
				}
				return recursiveProp.indexOf(props.filter) !== -1;
			});
		});
	}
}

/**
 * @internal
 */
@Pipe({
	name: 'thumbnailUrl',
	standalone: true
})
export class ThumbnailFromUrlPipe implements PipeTransform {
	transform(url: string): string {
		const lastPart = url.split('/').pop();
		const isMp4 = url.includes('.mp4');

		if (!lastPart || !isMp4) return url;

		return `recordings/${lastPart.split('.')[0]}/${lastPart.replace('mp4', 'jpg')}`;
	}
}
