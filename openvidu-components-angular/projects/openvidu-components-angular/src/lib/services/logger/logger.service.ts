import { Injectable } from '@angular/core';
import { ILogService, ILogger } from '../../models/logger.model';
import { GlobalConfigService } from '../config/global-config.service';

/**
 * @internal
 */
@Injectable({
	providedIn: 'root'
})
export class LoggerService implements ILogService {
	private log: Console;
	private LOG_FNS: Function[] = [];
	private MSG_PREFIXES: string[][] = [
		['[', '] DEBUG: '],
		['[', '] WARN: '],
		['[', '] ERROR: ']
	];
	private loggerCache: Map<string, ILogger> = new Map();

	constructor(private globalService: GlobalConfigService) {
		this.initializeLogger();
	}

	private initializeLogger(): void {
		this.log = window.console;
		this.LOG_FNS = [this.log.log.bind(this.log), this.log.warn.bind(this.log), this.log.error.bind(this.log)];
	}

	private createLoggerFunctions(prefix: string): [(...args: any[]) => void, (...args: any[]) => void, (...args: any[]) => void] {
		const prodMode = this.globalService.isProduction();

		const debugFn = (...args: any[]): void => {
			if (!prodMode) {
				// Only log debug messages in non-production mode
				this.LOG_FNS[0](this.MSG_PREFIXES[0][0] + prefix + this.MSG_PREFIXES[0][1], ...args);
			}
		};

		const warnFn = (...args: any[]): void => {
			this.LOG_FNS[1](this.MSG_PREFIXES[1][0] + prefix + this.MSG_PREFIXES[1][1], ...args);
		};

		const errorFn = (...args: any[]): void => {
			this.LOG_FNS[2](this.MSG_PREFIXES[2][0] + prefix + this.MSG_PREFIXES[2][1], ...args);
		};

		return [debugFn, warnFn, errorFn];
	}

	public get(prefix: string): ILogger {
		// Check cache first
		if (this.loggerCache.has(prefix)) {
			return this.loggerCache.get(prefix)!;
		}

		// Create new logger functions
		const [debugFn, warnFn, errorFn] = this.createLoggerFunctions(prefix);

		const logger: ILogger = {
			d: debugFn,
			w: warnFn,
			e: errorFn
		};

		// Cache the logger
		this.loggerCache.set(prefix, logger);

		return logger;
	}

	/**
	 * Clears the logger cache. Useful for testing or when configuration changes.
	 * @internal
	 */
	public clearCache(): void {
		this.loggerCache.clear();
	}
}
