import {JL} from 'jsnlog'
import {OpenVidu} from "../../OpenVidu/OpenVidu";
import {OpenViduLoggerConfiguration} from "./OpenViduLoggerConfiguration";
import JSNLogAjaxAppender = JL.JSNLogAjaxAppender;

export class OpenViduLogger {

	private static instance: OpenViduLogger;

	private JSNLOG_URL: string = "/openvidu/elk/openvidu-browser-logs";
	private MAX_JSNLOG_BATCH_LOG_MESSAGES: number = 50;
	private MAX_MSECONDS_BATCH_MESSAGES: number = 5000;

	private logger: Console = window.console;
	private loggingSessionId: string;
	private LOG_FNS = [this.logger.log, this.logger.debug, this.logger.info, this.logger.warn, this.logger.error];
	private currentAppender: any;

	private isProdMode = false;
	private isJSNLogSetup = false;


	private constructor() {}

	static configureJSNLog(openVidu: OpenVidu, sessionId: string, connectionId: string, token: string) {
		// If instance is created is OpenVidu Pro
		if (this.instance && openVidu.webrtcStatsInterval > -1
			// If logs are enabled
			&& openVidu.sendBrowserLogs === OpenViduLoggerConfiguration.debug
			// If diferent session or first session
			&& sessionId !== this.instance.loggingSessionId) {

			try {
				// isJSNLogSetup will not be true until completed setup
				this.instance.isJSNLogSetup = false;
				this.instance.info("Configuring JSNLogs.");

				const beforeSendCallback = (xhr) => {
					// If 401 or 403 or 404 modify ready and status so JSNLog don't retry to send logs
					// https://github.com/mperdeck/jsnlog.js/blob/v2.30.0/jsnlog.ts#L805-L818
					const parentReadyStateFunction = xhr.onreadystatechange;
					xhr.onreadystatechange = () => {
						if ((xhr.status == 401) || (xhr.status == 403) || (xhr.status == 404)) {
							Object.defineProperty( xhr, "readyState", {value: 4});
							Object.defineProperty( xhr, "status", {value: 200});
						}
						parentReadyStateFunction();
					}

					// Headers to identify and authenticate logs
					xhr.setRequestHeader('Authorization', "Basic " + btoa(`${connectionId}%/%${sessionId}` + ":" + token));
					xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest')
					// Additional headers for OpenVidu
					xhr.setRequestHeader('OV-Connection-Id', btoa(connectionId));
					xhr.setRequestHeader('OV-Session-Id', btoa(sessionId));
					xhr.setRequestHeader('OV-Token', btoa(token));
				}

				// Creation of the appender.
				this.instance.currentAppender = JL.createAjaxAppender("appender-" + connectionId);
				this.instance.currentAppender.setOptions({
					beforeSend: beforeSendCallback,
					maxBatchSize: 1000,
					batchSize: this.instance.MAX_JSNLOG_BATCH_LOG_MESSAGES,
					batchTimeout: this.instance.MAX_MSECONDS_BATCH_MESSAGES
				});

				// Avoid circular dependencies
				const logSerializer = (obj): string => {
					const getCircularReplacer = () => {
						const seen = new WeakSet();
						return (key, value) => {
							if (typeof value === "object" && value !== null) {
								if (seen.has(value)) {
									return;
								}
								seen.add(value);
							}
							return value;
						};
					};
					return JSON.stringify(obj, getCircularReplacer());
				};

				// Initialize JL to send logs
				JL.setOptions({
					defaultAjaxUrl: openVidu.httpUri + this.instance.JSNLOG_URL,
					serialize: logSerializer
				});
				JL().setOptions({
					appenders: [this.instance.currentAppender]
				});

				this.instance.isJSNLogSetup = true;
				this.instance.loggingSessionId = sessionId;
				this.instance.info("JSNLog configured.");
			} catch (e) {
				console.error("Error configuring JSNLog: ");
				console.error(e);
				this.instance.isJSNLogSetup = false;
			}
		}
	}

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
		if (this.isDebugLogEnabled()) {
			JL().info(arguments);
		}
	}

	debug(...args: any[]) {
		if (!this.isProdMode) {
			this.LOG_FNS[1].apply(this.logger, arguments);
		}
		if (this.isDebugLogEnabled()) {
			JL().debug(arguments);
		}
	}

	info(...args: any[]) {
		if (!this.isProdMode) {
			this.LOG_FNS[2].apply(this.logger, arguments);
		}
		if (this.isDebugLogEnabled()) {
			JL().info(arguments);
		}
	}

	warn(...args: any[]) {
		if (!this.isProdMode) {
			this.LOG_FNS[3].apply(this.logger, arguments);
		}
		if (this.isDebugLogEnabled()) {
			JL().warn(arguments);
		}
	}

	error(...args: any[]) {
		this.LOG_FNS[4].apply(this.logger, arguments);
		if (this.isDebugLogEnabled()) {
			JL().error(arguments);
		}
	}

	flush() {
		if(this.isDebugLogEnabled() && this.currentAppender != null) {
			this.currentAppender.sendBatch();
		}
	}

	enableProdMode(){
		this.isProdMode = true;
	}

	private isDebugLogEnabled() {
		return this.isJSNLogSetup;
	}

}
