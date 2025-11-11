export const safeJsonParse = <T = any>(text: string): T | null => {
	try {
		return JSON.parse(text) as T;
	} catch (e) {
		return null;
	}
};
