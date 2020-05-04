export class OpenViduLogger {

	private static instance: OpenViduLogger;
	private logger: Console = window.console;
	private LOG_FNS = [this.logger.log, this.logger.debug, this.logger.info, this.logger.warn, this.logger.error];
	private isProdMode = false;

	private constructor() {}

	static getInstance(): OpenViduLogger {
		if(!OpenViduLogger.instance){
			OpenViduLogger.instance = new OpenViduLogger();
		}
		return OpenViduLogger.instance;
	}

	log(...args: any[]){
		if (!this.isProdMode) {
			this.LOG_FNS[0].apply(this.logger, arguments);
		}
	}

	debug(...args: any[]) {
		if (!this.isProdMode) {
			this.LOG_FNS[1].apply(this.logger, arguments);
		}
	}

	info(...args: any[]) {
		if (!this.isProdMode) {
			this.LOG_FNS[2].apply(this.logger, arguments);
		}
	}

	warn(...args: any[]) {
		if (!this.isProdMode) {
			this.LOG_FNS[3].apply(this.logger, arguments);
		}
	}

	error(...args: any[]) {
		this.LOG_FNS[4].apply(this.logger, arguments);
	}

	enableProdMode(){
		this.isProdMode = true;
	}
}