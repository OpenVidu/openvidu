export interface ILogger {
	d(...args: any[]): void;
	w(...args: any[]): void;
	e(...args: any[]): void;
}

export interface ILogService {
	get(name: string): ILogger;
}
