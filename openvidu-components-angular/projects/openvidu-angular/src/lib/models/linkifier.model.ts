import { Autolinker, AutolinkerConfig, HashtagMatch } from 'autolinker';

/**
 * @internal
 */
const AUTOLINKER_CFGS: AutolinkerConfig = {
	urls: {
		schemeMatches: true,
		wwwMatches: true,
		tldMatches: true
	},
	email: true,
	phone: true,
	mention: 'twitter',
	hashtag: 'twitter',
	stripPrefix: false,
	stripTrailingSlash: false,
	newWindow: true,
	truncate: {
		length: 0,
		location: 'end'
	},
	decodePercentEncoding: true
};

/**
 * @internal
 */
export class Linkifier {
	private autolinker: Autolinker;

	constructor() {
		this.autolinker = new Autolinker(AUTOLINKER_CFGS);
	}

	public link(textOrHtml: string): string {
		return this.autolinker.link(textOrHtml);
	}
}
