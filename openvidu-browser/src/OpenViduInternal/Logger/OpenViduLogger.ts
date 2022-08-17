import { JL } from 'jsnlog';
import { OpenVidu } from '../../OpenVidu/OpenVidu';
import { ConsoleLogger } from './ConsoleLogger';
import { OpenViduLoggerConfiguration } from './OpenViduLoggerConfiguration';

export class OpenViduLogger {
    private static instance: OpenViduLogger;

    private JSNLOG_URL: string = '/openvidu/elk/openvidu-browser-logs';
    private MAX_JSNLOG_BATCH_LOG_MESSAGES: number = 100;
    private MAX_MSECONDS_BATCH_MESSAGES: number = 5000;
    private MAX_LENGTH_STRING_JSON: number = 1000;

    private defaultConsoleLogger: ConsoleLogger = new ConsoleLogger(globalThis.console);

    private currentAppender: any;

    private isProdMode = false;
    private isJSNLogSetup = false;

    // This two variables are used to restart JSNLog
    // on different sessions and different userIds
    private loggingSessionId: string | undefined;

    /**
     * @hidden
     */
    static configureJSNLog(openVidu: OpenVidu, token: string) {
        try {
            // If dev mode or...
            if (
                globalThis['LOG_JSNLOG_RESULTS'] ||
                // If instance is created and it is OpenVidu Pro
                (this.instance &&
                    openVidu.isAtLeastPro &&
                    // If logs are enabled
                    this.instance.isOpenViduBrowserLogsDebugActive(openVidu) &&
                    // Only reconfigure it if session or finalUserId has changed
                    this.instance.canConfigureJSNLog(openVidu, this.instance))
            ) {
                // Check if app logs can be sent
                // and replace console.log function to send
                // logs of the application
                if (openVidu.sendBrowserLogs === OpenViduLoggerConfiguration.debug_app) {
                    this.instance.replaceWindowConsole();
                }

                // isJSNLogSetup will not be true until completed setup
                this.instance.isJSNLogSetup = false;
                this.instance.info('Configuring JSNLogs.');

                const finalUserId = openVidu.finalUserId;
                const sessionId = openVidu.session.sessionId;

                const beforeSendCallback = (xhr) => {
                    // If 401 or 403 or 404 modify ready and status so JSNLog don't retry to send logs
                    // https://github.com/mperdeck/jsnlog.js/blob/v2.30.0/jsnlog.ts#L805-L818
                    const parentReadyStateFunction = xhr.onreadystatechange;
                    xhr.onreadystatechange = () => {
                        if (this.isInvalidResponse(xhr)) {
                            Object.defineProperty(xhr, 'readyState', { value: 4 });
                            Object.defineProperty(xhr, 'status', { value: 200 });
                            // Disable JSNLog too to not send periodically errors
                            this.instance.disableLogger();
                        }
                        parentReadyStateFunction();
                    };

                    // Headers to identify and authenticate logs
                    xhr.setRequestHeader('Authorization', 'Basic ' + btoa(`${finalUserId}%/%${sessionId}` + ':' + token));
                    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                    // Additional headers for OpenVidu
                    xhr.setRequestHeader('OV-Final-User-Id', finalUserId);
                    xhr.setRequestHeader('OV-Session-Id', sessionId);
                    xhr.setRequestHeader('OV-Token', token);
                };

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
                            if (typeof value === 'object' && value != null) {
                                if (seen.has(value) || (globalThis.HTMLElement && value instanceof HTMLElement)) {
                                    return;
                                }
                                seen.add(value);
                            }
                            return value;
                        };
                    };

                    // Cut long messages
                    let stringifyJson = JSON.stringify(obj, getCircularReplacer());
                    if (stringifyJson.length > this.instance.MAX_LENGTH_STRING_JSON) {
                        stringifyJson = `${stringifyJson.substring(0, this.instance.MAX_LENGTH_STRING_JSON)}...`;
                    }

                    if (globalThis['LOG_JSNLOG_RESULTS']) {
                        console.log(stringifyJson);
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
                this.instance.info('JSNLog configured.');
            }
        } catch (e) {
            // Print error
            console.error('Error configuring JSNLog: ');
            console.error(e);
            // Restore defaults values just in case any exception happen-
            this.instance.disableLogger();
        }
    }

    /**
     * @hidden
     */
    static getInstance(): OpenViduLogger {
        if (!OpenViduLogger.instance) {
            OpenViduLogger.instance = new OpenViduLogger();
        }
        return OpenViduLogger.instance;
    }

    private static isInvalidResponse(xhr: XMLHttpRequest) {
        return xhr.status == 401 || xhr.status == 403 || xhr.status == 404 || xhr.status == 0;
    }

    private canConfigureJSNLog(openVidu: OpenVidu, logger: OpenViduLogger): boolean {
        return openVidu.session.sessionId != logger.loggingSessionId;
    }

    private isOpenViduBrowserLogsDebugActive(openVidu: OpenVidu) {
        return (
            openVidu.sendBrowserLogs === OpenViduLoggerConfiguration.debug ||
            openVidu.sendBrowserLogs === OpenViduLoggerConfiguration.debug_app
        );
    }

    // Return console functions with jsnlog integration
    private getConsoleWithJSNLog() {
        return (function (openViduLogger: OpenViduLogger) {
            return {
                log: function (...args) {
                    openViduLogger.defaultConsoleLogger.log.apply(openViduLogger.defaultConsoleLogger.logger, arguments);
                    if (openViduLogger.isJSNLogSetup) {
                        JL().info(arguments);
                    }
                },
                info: function (...args) {
                    openViduLogger.defaultConsoleLogger.info.apply(openViduLogger.defaultConsoleLogger.logger, arguments);
                    if (openViduLogger.isJSNLogSetup) {
                        JL().info(arguments);
                    }
                },
                debug: function (...args) {
                    openViduLogger.defaultConsoleLogger.debug.apply(openViduLogger.defaultConsoleLogger.logger, arguments);
                },
                warn: function (...args) {
                    openViduLogger.defaultConsoleLogger.warn.apply(openViduLogger.defaultConsoleLogger.logger, arguments);
                    if (openViduLogger.isJSNLogSetup) {
                        JL().warn(arguments);
                    }
                },
                error: function (...args) {
                    openViduLogger.defaultConsoleLogger.error.apply(openViduLogger.defaultConsoleLogger.logger, arguments);
                    if (openViduLogger.isJSNLogSetup) {
                        JL().error(arguments);
                    }
                }
            };
        })(this);
    }

    private replaceWindowConsole() {
        globalThis.console = this.defaultConsoleLogger.logger;
        globalThis.console.log = this.getConsoleWithJSNLog().log;
        globalThis.console.info = this.getConsoleWithJSNLog().info;
        globalThis.console.debug = this.getConsoleWithJSNLog().debug;
        globalThis.console.warn = this.getConsoleWithJSNLog().warn;
        globalThis.console.error = this.getConsoleWithJSNLog().error;
    }

    private disableLogger() {
        JL.setOptions({ enabled: false });
        this.isJSNLogSetup = false;
        this.loggingSessionId = undefined;
        this.currentAppender = undefined;
        globalThis.console = this.defaultConsoleLogger.logger;
        globalThis.console.log = this.defaultConsoleLogger.log;
        globalThis.console.info = this.defaultConsoleLogger.info;
        globalThis.console.debug = this.defaultConsoleLogger.debug;
        globalThis.console.warn = this.defaultConsoleLogger.warn;
        globalThis.console.error = this.defaultConsoleLogger.error;
    }

    /**
     * @hidden
     */
    log(...args: any[]) {
        if (!this.isProdMode) {
            this.defaultConsoleLogger.log.apply(this.defaultConsoleLogger.logger, arguments);
        }
        if (this.isJSNLogSetup) {
            JL().info(arguments);
        }
    }

    /**
     * @hidden
     */
    debug(...args: any[]) {
        if (!this.isProdMode) {
            this.defaultConsoleLogger.debug.apply(this.defaultConsoleLogger.logger, arguments);
        }
    }

    /**
     * @hidden
     */
    info(...args: any[]) {
        if (!this.isProdMode) {
            this.defaultConsoleLogger.info.apply(this.defaultConsoleLogger.logger, arguments);
        }
        if (this.isJSNLogSetup) {
            JL().info(arguments);
        }
    }

    /**
     * @hidden
     */
    warn(...args: any[]) {
        this.defaultConsoleLogger.warn.apply(this.defaultConsoleLogger.logger, arguments);
        if (this.isJSNLogSetup) {
            JL().warn(arguments);
        }
    }

    /**
     * @hidden
     */
    error(...args: any[]) {
        this.defaultConsoleLogger.error.apply(this.defaultConsoleLogger.logger, arguments);
        if (this.isJSNLogSetup) {
            JL().error(arguments);
        }
    }

    /**
     * @hidden
     */
    flush() {
        if (this.isJSNLogSetup && this.currentAppender != null) {
            this.currentAppender.sendBatch();
        }
    }

    enableProdMode() {
        this.isProdMode = true;
    }
}
