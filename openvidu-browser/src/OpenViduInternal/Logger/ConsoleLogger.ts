type ConsoleFunction = (...data: any) => void;
export class ConsoleLogger {

    /**
     * @hidden
     */
    logger: Console

    /**
     * @hidden
     */
    log: ConsoleFunction

    /**
     * @hidden
     */
    info: ConsoleFunction

    /**
     * @hidden
     */
    debug: ConsoleFunction

    /**
     * @hidden
     */
    warn: ConsoleFunction

    /**
     * @hidden
     */
    error: ConsoleFunction

    constructor(console: Console) {
        this.logger = console;
        this.log = window.console.log,
        this.info = window.console.info,
        this.debug = window.console.debug,
        this.warn = window.console.warn,
        this.error = window.console.error
    }
}