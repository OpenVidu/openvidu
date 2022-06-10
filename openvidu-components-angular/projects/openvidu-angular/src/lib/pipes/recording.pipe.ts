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

/**
 * @internal
 */
 @Pipe({
	name: 'searchByStringProperty'
})
export class SearchByStringPropertyPipe implements PipeTransform {
	transform(items: any[], props: { properties: string[], filter: string }): any {
		if (!items || !props || props.properties.length === 0 || !props.filter) {
		  return items;
		}
		return items.filter(item => {
		  return props.properties.some(prop => {
			const multipleProps = prop.split('.');
			let recursiveProp = item;
			try {
			  multipleProps.forEach(p => {
				recursiveProp = recursiveProp[p];
				if (recursiveProp === null || recursiveProp === undefined) {
				  throw new Error('Property not found');
				}
			  });
			} catch (error) {
			  return false;
			}
			return recursiveProp.indexOf(props.filter) !== -1;
		  })
		});
	  }
}
