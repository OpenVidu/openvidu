export const safeJsonParse = <T = any>(text: string): T | null => {
	try {
		return JSON.parse(text) as T;
	} catch (e) {
		return null;
	}
};

const TRANSIENT_MEDIA_DEVICE_ERROR_NAMES = ['AbortError', 'NotReadableError'];

export const isTransientMediaDeviceError = (error: unknown): boolean => {
	const name = (error as { name?: string } | undefined)?.name;
	return !!name && TRANSIENT_MEDIA_DEVICE_ERROR_NAMES.includes(name);
};

export const retryOnTransientMediaDeviceError = async <T>(
	operation: () => Promise<T>,
	onRetry?: (error: unknown, attempt: number, delayMs: number) => void,
	maxAttempts: number = 3,
	baseDelayMs: number = 400
): Promise<T> => {
	let lastError: unknown;

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			return await operation();
		} catch (error) {
			lastError = error;

			if (attempt === maxAttempts || !isTransientMediaDeviceError(error)) {
				break;
			}

			const delayMs = baseDelayMs * attempt;
			onRetry?.(error, attempt, delayMs);
			await new Promise((resolve) => setTimeout(resolve, delayMs));
		}
	}

	throw lastError;
};
