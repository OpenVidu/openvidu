import { Pipe, PipeTransform } from '@angular/core';
import { TranslateService } from '../services/translate/translate.service';

/**
 * @internal
 */
@Pipe({ name: 'translate', pure: false })
export class TranslatePipe implements PipeTransform {
	constructor(private translateService: TranslateService) {}

	transform(str: string): string {

		const translation = this.translateService.translate(str);
		return translation.replace('OpenVidu PRO', '<a href="https://docs.openvidu.io/en/stable/openvidu-pro/" target="_blank">OpenVidu PRO</a>');
	}
}
