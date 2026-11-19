/** External destinations of the UI; they open in a new tab with `rel="noopener"`. */
export const EXTERNAL_LINKS = {
	documentation: 'https://openvidu.io/latest/docs/self-hosting/production-ready/observability/openvidu-dashboard/',
	/** The section of the documentation on returning the space freed by a deletion to the system. */
	freeingDiskSpace:
		'https://openvidu.io/latest/docs/self-hosting/production-ready/observability/openvidu-dashboard/#freeing-disk-space',
	analyticsSettings: 'https://openvidu.io/latest/docs/self-hosting/configuration/reference/#analytics-settings',
	pro: 'https://openvidu.io/pricing/'
} as const;
