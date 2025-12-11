import { Pipe, PipeTransform } from '@angular/core';
import { Linkifier } from '../models/linkifier.model';

/**
 * @internal
 */
@Pipe({ name: 'linkify', standalone: true })
export class LinkifyPipe implements PipeTransform {
	private linkifer: Linkifier;

	constructor() {
		this.linkifer = new Linkifier();
	}

	transform(str: string): string {
		return str ? this.linkifer.link(str) : str;
	}
}
