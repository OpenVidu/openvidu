import { Directive, ElementRef, Input, OnDestroy, OnInit } from '@angular/core';
import { CaptionsLangOption } from '../../models/caption.model';
import { CaptionService } from '../../services/caption/caption.service';
import { OpenViduAngularConfigService } from '../../services/config/openvidu-angular.config.service';
import { TranslateService } from '../../services/translate/translate.service';
import { LangOption } from '../../models/lang.model';

/**
 * The **minimal** directive applies a minimal UI hiding all controls except for cam and mic.
 *
 * It is only available for {@link VideoconferenceComponent}.
 *
 *  Default: `false`
 *
 * @example
 * <ov-videoconference [minimal]="true"></ov-videoconference>
 */
@Directive({
	selector: 'ov-videoconference[minimal]'
})
export class MinimalDirective implements OnDestroy {
	/**
	 * @ignore
	 */
	@Input() set minimal(value: boolean) {
		this.update(value);
	}

	/**
	 * @ignore
	 */
	constructor(public elementRef: ElementRef, private libService: OpenViduAngularConfigService) {}

	/**
	 * @ignore
	 */
	ngOnDestroy(): void {
		this.clear();
	}

	/**
	 * @ignore
	 */
	clear() {
		this.update(false);
	}

	/**
	 * @ignore
	 */
	update(value: boolean) {
		if (this.libService.minimal.getValue() !== value) {
			this.libService.minimal.next(value);
		}
	}
}

/**
 * The **lang** directive allows set the UI language to a default language.
 *
 * It is only available for {@link VideoconferenceComponent}.
 *
 * **Default:** English `en`
 *
 * **Available:**
 *
 * * English: `en`
 * * Spanish: `es`
 * * German: `de`
 * * French: `fr`
 * * Chinese: `cn`
 * * Hindi: `hi`
 * * Italian: `it`
 * * Japanese: `ja`
 * * Netherlands: `nl`
 * * Portuguese: `pt`
 *
 * @example
 * <ov-videoconference [lang]="'es'"></ov-videoconference>
 */
@Directive({
	selector: 'ov-videoconference[lang]'
})
export class LangDirective implements OnDestroy {
	/**
	 * @ignore
	 */
	@Input() set lang(value: string) {
		this.update(value);
	}

	/**
	 * @ignore
	 */
	constructor(public elementRef: ElementRef, private translateService: TranslateService) {}

	/**
	 * @ignore
	 */
	ngOnDestroy(): void {
		this.clear();
	}

	/**
	 * @ignore
	 */
	clear() {
		this.update('en');
	}

	/**
	 * @ignore
	 */
	update(value: string) {
		this.translateService.setLanguage(value);
	}
}

/**
 * The **langOptions** directive allows to set the application language options.
 * It will override the application languages provided by default.
 * This propety is an array of objects which must comply with the {@link LangOption} interface.
 *
 * It is only available for {@link VideoconferenceComponent}.
 *
 * Default: ```
 * [
 * 	{ name: 'English', lang: 'en' },
 *  { name: 'Español', lang: 'es' },
 *  { name: 'Deutsch', lang: 'de' },
 *  { name: 'Français', lang: 'fr' },
 *  { name: '中国', lang: 'cn' },
 *  { name: 'हिन्दी', lang: 'hi' },
 *  { name: 'Italiano', lang: 'it' },
 *  { name: '日本語', lang: 'ja' },
 *  { name: 'Dutch', lang: 'nl' },
 *  { name: 'Português', lang: 'pt' }
 * ]```
 *
 * Note: If you want to add a new language, you must add a new object with the name and the language code (e.g. `{ name: 'Custom', lang: 'cus' }`)
 * and then add the language file in the `assets/lang` folder with the name `cus.json`.
 *
 *
 * @example
 * <ov-videoconference [langOptions]="[{name:'Spanish', lang: 'es'}]"></ov-videoconference>
 */
@Directive({
	selector: 'ov-videoconference[langOptions]'
})
export class LangOptionsDirective implements OnDestroy {
	/**
	 * @ignore
	 */
	@Input() set langOptions(value: LangOption[]) {
		this.update(value);
	}

	/**
	 * @ignore
	 */
	constructor(public elementRef: ElementRef, private translateService: TranslateService) {}

	/**
	 * @ignore
	 */
	ngOnDestroy(): void {
		this.clear();
	}

	/**
	 * @ignore
	 */
	clear() {
		this.update(undefined);
	}

	/**
	 * @ignore
	 */
	update(value: LangOption[] | undefined) {
		this.translateService.setLanguageOptions(value);
	}
}

/**
 * The **captionsLang** directive allows specify the deafult language that OpenVidu will try to recognise.
 *
 * It is only available for {@link VideoconferenceComponent}.
 *
 * It must be a valid [BCP-47](https://tools.ietf.org/html/bcp47) language tag like "en-US" or "es-ES".
 *
 *
 * **Default:** English `en-US`
 *
 * **Available:**
 *
 * * English: `en-US`
 * * Spanish: `es-ES`
 * * German: `de-DE`
 * * French: `fr-FR`
 * * Chinese: `zh-CN`
 * * Hindi: `hi-IN`
 * * Italian: `it-IT`
 * * Japanese: `jp-JP`
 * * Portuguese: `pt-PT`
 *
 * @example
 * <ov-videoconference [captionsLang]="'es-ES'"></ov-videoconference>
 */
@Directive({
	selector: 'ov-videoconference[captionsLang]'
})
export class CaptionsLangDirective implements OnDestroy {
	/**
	 * @ignore
	 */
	@Input() set captionsLang(value: string) {
		this.update(value);
	}

	/**
	 * @ignore
	 */
	constructor(public elementRef: ElementRef, private captionService: CaptionService) {}

	/**
	 * @ignore
	 */
	ngOnDestroy(): void {
		this.clear();
	}

	/**
	 * @ignore
	 */
	clear() {
		this.update('en-US');
	}

	/**
	 * @ignore
	 */
	update(value: string) {
		this.captionService.setLanguage(value);
	}
}

/**
 * The **captionsLangOptions** directive allows to set the language options for the captions.
 * It will override the languages provided by default.
 * This propety is an array of objects which must comply with the {@link CaptionsLangOption} interface.
 *
 * It is only available for {@link VideoconferenceComponent}.
 *
 * Default: ```
 * [
 * 	{ name: 'English', lang: 'en-US' },
 * 	{ name: 'Español', lang: 'es-ES' },
 * 	{ name: 'Deutsch', lang: 'de-DE' },
 * 	{ name: 'Français', lang: 'fr-FR' },
 * 	{ name: '中国', lang: 'zh-CN' },
 * 	{ name: 'हिन्दी', lang: 'hi-IN' },
 * 	{ name: 'Italiano', lang: 'it-IT' },
 * 	{ name: '日本語', lang: 'jp-JP' },
 * 	{ name: 'Português', lang: 'pt-PT' }
 * ]```
 *
 * @example
 * <ov-videoconference [captionsLangOptions]="[{name:'Spanish', lang: 'es-ES'}]"></ov-videoconference>
 */
@Directive({
	selector: 'ov-videoconference[captionsLangOptions]'
})
export class CaptionsLangOptionsDirective implements OnDestroy {
	/**
	 * @ignore
	 */
	@Input() set captionsLangOptions(value: CaptionsLangOption[]) {
		this.update(value);
	}

	/**
	 * @ignore
	 */
	constructor(public elementRef: ElementRef, private captionService: CaptionService) {}

	/**
	 * @ignore
	 */
	ngOnDestroy(): void {
		this.clear();
	}

	/**
	 * @ignore
	 */
	clear() {
		this.update(undefined);
	}

	/**
	 * @ignore
	 */
	update(value: CaptionsLangOption[] | undefined) {
		this.captionService.setLanguageOptions(value);
	}
}

/**
 * The **participantName** directive sets the participant name. It can be useful for aplications which doesn't need the prejoin page.
 *
 * It is only available for {@link VideoconferenceComponent}.
 *
 * @example
 * <ov-videoconference [participantName]="'OpenVidu'"></ov-videoconference>
 */
@Directive({
	selector: 'ov-videoconference[participantName]'
})
export class ParticipantNameDirective implements OnInit {
	// Avoiding update participantName dynamically.
	// The participantName must be updated from UI
	/**
	 * @ignore
	 */
	@Input() participantName: string;

	/**
	 * @ignore
	 */
	constructor(public elementRef: ElementRef, private libService: OpenViduAngularConfigService) {}

	/**
	 * @ignore
	 */
	ngOnInit(): void {
		this.update(this.participantName);
	}

	/**
	 * @ignore
	 */
	ngOnDestroy(): void {
		this.clear();
	}

	/**
	 * @ignore
	 */
	clear() {
		this.update('');
	}

	/**
	 * @ignore
	 */
	update(value: string) {
		this.libService.participantName.next(value);
	}
}

/**
 * The **prejoin** directive allows show/hide the prejoin page for selecting media devices.
 *
 * It is only available for {@link VideoconferenceComponent}.
 *
 * Default: `true`
 *
 * @example
 * <ov-videoconference [prejoin]="false"></ov-videoconference>
 */
@Directive({
	selector: 'ov-videoconference[prejoin]'
})
export class PrejoinDirective implements OnDestroy {
	/**
	 * @ignore
	 */
	@Input() set prejoin(value: boolean) {
		this.update(value);
	}

	/**
	 * @ignore
	 */
	constructor(public elementRef: ElementRef, private libService: OpenViduAngularConfigService) {}

	/**
	 * @ignore
	 */
	ngOnDestroy(): void {
		this.clear();
	}

	/**
	 * @ignore
	 */
	clear() {
		this.update(true);
	}

	/**
	 * @ignore
	 */
	update(value: boolean) {
		if (this.libService.prejoin.getValue() !== value) {
			this.libService.prejoin.next(value);
		}
	}
}

/**
 * The **videoMuted** directive allows to join the session with camera muted/unmuted.
 *
 * It is only available for {@link VideoconferenceComponent}.
 *
 * Default: `false`
 *
 *
 * @example
 * <ov-videoconference [videoMuted]="true"></ov-videoconference>
 */
@Directive({
	selector: 'ov-videoconference[videoMuted]'
})
export class VideoMutedDirective implements OnDestroy {
	/**
	 * @ignore
	 */
	@Input() set videoMuted(value: boolean) {
		this.update(value);
	}

	/**
	 * @ignore
	 */
	constructor(public elementRef: ElementRef, private libService: OpenViduAngularConfigService) {}

	/**
	 * @ignore
	 */
	ngOnDestroy(): void {
		this.clear();
	}

	/**
	 * @ignore
	 */
	clear() {
		this.update(false);
	}

	/**
	 * @ignore
	 */
	update(value: boolean) {
		if (this.libService.videoMuted.getValue() !== value) {
			this.libService.videoMuted.next(value);
		}
	}
}

/**
 * The **audioMuted** directive allows to join the session with microphone muted/unmuted.
 *
 * It is only available for {@link VideoconferenceComponent}.
 *
 * Default: `false`
 *
 * @example
 * <ov-videoconference [audioMuted]="true"></ov-videoconference>
 */

@Directive({
	selector: 'ov-videoconference[audioMuted]'
})
export class AudioMutedDirective implements OnDestroy {
	/**
	 * @ignore
	 */
	@Input() set audioMuted(value: boolean) {
		this.update(value);
	}

	/**
	 * @ignore
	 */
	constructor(public elementRef: ElementRef, private libService: OpenViduAngularConfigService) {}

	ngOnDestroy(): void {
		this.clear();
	}

	/**
	 * @ignore
	 */
	clear() {
		this.update(false);
	}

	/**
	 * @ignore
	 */
	update(value: boolean) {
		if (this.libService.audioMuted.getValue() !== value) {
			this.libService.audioMuted.next(value);
		}
	}
}

/**
 * The **simulcast** directive allows to enable/disable the Simulcast feature. Simulcast is a technique that allows
 * to send multiple versions of the same video stream at different resolutions, framerates and qualities. This way,
 * the receiver can subscribe to the most appropriate stream for its current network conditions.
 *
 * It is only available for {@link VideoconferenceComponent} and **only if OpenVidu Server was configured to use the
 * mediasoup media server**. Otherwise, Simulcast will be disabled.
 *
 * Default: `false`
 *
 * @example
 * <ov-videoconference [simulcast]="true"></ov-videoconference>
 */
@Directive({
	selector: 'ov-videoconference[simulcast]'
})
export class SimulcastDirective implements OnDestroy {
	/**
	 * @ignore
	 */
	@Input() set simulcast(value: boolean) {
		this.update(value);
	}

	/**
	 * @ignore
	 */
	constructor(public elementRef: ElementRef, private libService: OpenViduAngularConfigService) {}

	/**
	 * @ignore
	 */
	ngOnDestroy(): void {
		this.clear();
	}

	/**
	 * @ignore
	 */
	clear() {
		this.update(false);
	}

	/**
	 * @ignore
	 */
	update(value: boolean) {
		if (this.libService.simulcast.getValue() !== value) {
			this.libService.simulcast.next(value);
		}
	}
}
