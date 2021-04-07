import {JL} from 'jsnlog'
import {OpenVidu} from "../../OpenVidu/OpenVidu";
import {OpenViduLoggerConfiguration} from "./OpenViduLoggerConfiguration";

export class OpenViduLogger {

	private static instance: OpenViduLogger;

	private JSNLOG_URL: string = "/openvidu/elk/openvidu-browser-logs";
	private MAX_JSNLOG_BATCH_LOG_MESSAGES: number = 50;
	private MAX_MSECONDS_BATCH_MESSAGES: number = 5000;

	private openvidu: OpenVidu;
	private logger: Console = window.console;
	private LOG_FNS = [this.logger.log, this.logger.debug, this.logger.info, this.logger.warn, this.logger.error];
	private isProdMode = false;
	private isJSNLogEnabled = true;
	private isJSNLogSetup = false;
	private customAppenders: JL.JSNLogAjaxAppender[] = [];


	private constructor() {}

	/**
	 * Configure http uri to send logs using JSNlog
	 */
	static configureJSNLog(openVidu: OpenVidu, sessionId: string, connectionId: string, token: string) {
		// If instance is not null, JSNLog is enabled and is OpenVidu Pro
		if (this.instance && this.instance.isJSNLogEnabled && openVidu.webrtcStatsInterval > -1 && openVidu.sendBrowserLogs === OpenViduLoggerConfiguration.debug) {
			this.instance.info("Configuring JSNLogs.");
			try {
				this.instance.openvidu = openVidu;

				// Use connection id as user and token as password
				const openViduJSNLogHeaders = (xhr) => {
					xhr.setRequestHeader('Authorization', "Basic " + btoa(`${connectionId}%/%${sessionId}` + ":" + token));
					xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest')
					// Additional headers for OpenVidu
					xhr.setRequestHeader('OV-Connection-Id', btoa(connectionId));
					xhr.setRequestHeader('OV-Session-Id', btoa(sessionId));
					xhr.setRequestHeader('OV-Token', btoa(token));
				}

				const customAppender: any = JL.createAjaxAppender("openvidu-browser-logs-appender-" + connectionId);
				customAppender.setOptions({
					beforeSend: openViduJSNLogHeaders,
					maxBatchSize: 1000,
					batchSize: this.instance.MAX_JSNLOG_BATCH_LOG_MESSAGES,
					batchTimeout: this.instance.MAX_MSECONDS_BATCH_MESSAGES
				});
				this.instance.customAppenders.push(customAppender);

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
					defaultAjaxUrl: OpenViduLogger.instance.openvidu.httpUri + this.instance.JSNLOG_URL,
					serialize: logSerializer
				});
				JL().setOptions({
					appenders: [customAppender]
				});
				
				this.instance.isJSNLogSetup = true;
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
		if(this.isDebugLogEnabled()) {
			for(const appender of this.customAppenders) {
				if (appender.sendBatch) appender.sendBatch();
			}
		}
	}

	enableProdMode(){
		this.isProdMode = true;
	}

	disableBrowserLogsMonitoring() {
		this.isJSNLogEnabled = false;
	}

	private isDebugLogEnabled() {
		return this.isJSNLogEnabled && this.isJSNLogSetup;
	}

}