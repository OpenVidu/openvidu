import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'tooltipList', pure: true })
export class TooltipListPipe implements PipeTransform {
	transform(lines: string[]): string {
		let list = '';
		lines.forEach((line) => {
			list += '• ' + line + '\n';
		});

		return list;
	}
}
