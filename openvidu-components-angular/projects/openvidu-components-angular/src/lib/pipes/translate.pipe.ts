import { Pipe, PipeTransform } from '@angular/core';
import { TranslateService } from '../services/translate/translate.service';

/**
 * @internal
 */
@Pipe({
    name: 'translate', pure: false,
    standalone: true
})
export class TranslatePipe implements PipeTransform {
	constructor(private translateService: TranslateService) {}

	transform(str: string): string {
		const translation = this.translateService.translate(str);
		if (translation?.includes('OpenVidu PRO')) {
			return translation.replace(
				'OpenVidu PRO',
				'<a href="https://openvidu.io/pricing/#openvidu-pro" target="_blank">OpenVidu PRO</a>'
			);
		}
		return translation;
	}
}
