/**
 * @internal
 */
export interface ILogger {
	d(...args: any[]): void;
	v(...args: any[]): void;
	w(...args: any[]): void;
	e(...args: any[]): void;
}

/**
 * @internal
 */
export interface ILogService {
	get(name: string): ILogger;
}
