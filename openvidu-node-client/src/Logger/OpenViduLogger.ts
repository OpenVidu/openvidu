import { ConsoleLogger } from './ConsoleLogger';

export class OpenViduLogger {
    private static instance: OpenViduLogger;
    private defaultConsoleLogger: ConsoleLogger = new ConsoleLogger(globalThis.console);
    private isProdMode = false;

    /**
     * @hidden
     */
    static getInstance(): OpenViduLogger {
        if (!OpenViduLogger.instance) {
            OpenViduLogger.instance = new OpenViduLogger();
        }
        return OpenViduLogger.instance;
    }

    /**
     * @hidden
     */
    log(...args: any[]) {
        if (!this.isProdMode) {
            this.defaultConsoleLogger.log.apply(this.defaultConsoleLogger.logger, arguments);
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
    }

    /**
     * @hidden
     */
    warn(...args: any[]) {
        this.defaultConsoleLogger.warn.apply(this.defaultConsoleLogger.logger, arguments);
    }

    /**
     * @hidden
     */
    error(...args: any[]) {
        this.defaultConsoleLogger.error.apply(this.defaultConsoleLogger.logger, arguments);
    }

    enableProdMode() {
        this.isProdMode = true;
    }
}
