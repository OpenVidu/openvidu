type ConsoleFunction = (...data: any) => void;
export class ConsoleLogger {
    /**
     * @hidden
     */
    logger: Console;

    /**
     * @hidden
     */
    log: ConsoleFunction;

    /**
     * @hidden
     */
    info: ConsoleFunction;

    /**
     * @hidden
     */
    debug: ConsoleFunction;

    /**
     * @hidden
     */
    warn: ConsoleFunction;

    /**
     * @hidden
     */
    error: ConsoleFunction;

    constructor(console: Console) {
        this.logger = console;
        (this.log = console.log),
            (this.info = console.info),
            (this.debug = console.debug),
            (this.warn = console.warn),
            (this.error = console.error);
    }
}
