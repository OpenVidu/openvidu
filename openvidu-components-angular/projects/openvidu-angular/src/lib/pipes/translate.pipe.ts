import { Pipe, PipeTransform } from '@angular/core';
import { TranslateService } from '../services/translate/translate.service';

/**
 * @internal
 */
@Pipe({ name: 'translate', pure: false })
export class TranslatePipe implements PipeTransform {
	constructor(private translateService: TranslateService) {}

	transform(str: string): string {
		return this.translateService.translate(str);
	}
}
