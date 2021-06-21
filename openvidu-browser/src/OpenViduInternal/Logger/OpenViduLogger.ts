import {JL} from 'jsnlog'
import {OpenVidu} from "../../OpenVidu/OpenVidu";
import {OpenViduLoggerConfiguration} from "./OpenViduLoggerConfiguration";
import JSNLogAjaxAppender = JL.JSNLogAjaxAppender;

export class OpenViduLogger {

	private static instance: OpenViduLogger;

	private JSNLOG_URL: string = "/openvidu/elk/openvidu-browser-logs";
	private MAX_JSNLOG_BATCH_LOG_MESSAGES: number = 100;
	private MAX_MSECONDS_BATCH_MESSAGES: number = 5000;
	private MAX_LENGTH_STRING_JSON: number = 1000;

	private logger: Console = window.console;
	private LOG_FNS = [this.logger.log, this.logger.debug, this.logger.info, this.logger.warn, this.logger.error];
	private currentAppender: any;

	private isProdMode = false;
	private isJSNLogSetup = false;

	// This two variables are used to restart JSNLog
	// on different sessions and different userIds
	private loggingSessionId: string | undefined;
	private loggingFinalUserId: string | undefined;


	private constructor() {}

	static configureJSNLog(openVidu: OpenVidu, token: string) {
		try {
			// If instance is created and it is OpenVidu Pro
			if (this.instance && openVidu.webrtcStatsInterval > -1
				// If logs are enabled
				&& openVidu.sendBrowserLogs === OpenViduLoggerConfiguration.debug
				// Only reconfigure it if session or finalUserId has changed
				&& this.instance.canConfigureJSNLog(openVidu, this.instance)) {
				// isJSNLogSetup will not be true until completed setup
				this.instance.isJSNLogSetup = false;
				this.instance.info("Configuring JSNLogs.");

				const finalUserId = openVidu.finalUserId;
				const sessionId = openVidu.session.sessionId;

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
					xhr.setRequestHeader('Authorization', "Basic " + btoa(`${finalUserId}%/%${sessionId}` + ":" + token));
					xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest')
					// Additional headers for OpenVidu
					xhr.setRequestHeader('OV-Final-User-Id', finalUserId);
					xhr.setRequestHeader('OV-Session-Id', sessionId);
					xhr.setRequestHeader('OV-Token', token);
				}

				// Creation of the appender.
				this.instance.currentAppender = JL.createAjaxAppender(`appender-${finalUserId}-${sessionId}`);
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
							if (typeof value === "object" && value != null) {
								if (seen.has(value) || value instanceof HTMLElement) {
									return;
								}
								seen.add(value);
							}
							return value;
						};
					};

					// Cut long messages
					const stringifyJson = JSON.stringify(obj, getCircularReplacer());
					if (stringifyJson.length > this.instance.MAX_LENGTH_STRING_JSON) {
						return `${stringifyJson.substring(0, this.instance.MAX_LENGTH_STRING_JSON)}...`;
					}
					return stringifyJson;
				};

				// Initialize JL to send logs
				JL.setOptions({
					defaultAjaxUrl: openVidu.httpUri + this.instance.JSNLOG_URL,
					serialize: logSerializer,
					enabled: true
				});
				JL().setOptions({
					appenders: [this.instance.currentAppender]
				});

				this.instance.isJSNLogSetup = true;
				this.instance.loggingSessionId = sessionId;
				this.instance.loggingFinalUserId = finalUserId;
				this.instance.info("JSNLog configured.");
			}
		} catch (e) {
			console.error("Error configuring JSNLog: ");
			console.error(e);
			this.instance.isJSNLogSetup = false;
			this.instance.loggingSessionId = undefined;
			this.instance.loggingFinalUserId = undefined;
			this.instance.currentAppender = undefined;
		}
	}

	static getInstance(): OpenViduLogger {
		if(!OpenViduLogger.instance){
			OpenViduLogger.instance = new OpenViduLogger();
		}
		return OpenViduLogger.instance;
	}

	private isDebugLogEnabled() {
		return this.isJSNLogSetup;
	}

	private canConfigureJSNLog(openVidu: OpenVidu, logger: OpenViduLogger): boolean {
		return openVidu.session.sessionId != logger.loggingSessionId
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

}
