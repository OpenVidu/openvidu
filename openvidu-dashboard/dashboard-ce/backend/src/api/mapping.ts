export function iso(date: Date): string;
export function iso(date: Date | undefined): string | undefined;
export function iso(date: Date | undefined): string | undefined {
	return date?.toISOString();
}
