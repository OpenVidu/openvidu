/**
 * @internal
 */
export enum StorageKeys {
	PARTICIPANT_NAME = 'participantName',
	VIDEO_DEVICE = 'videoDevice',
	AUDIO_DEVICE = 'audioDevice',
	MICROPHONE_ENABLED = 'microphoneEnabled',
	CAMERA_ENABLED = 'cameraEnabled',
	LANG = 'lang',
	CAPTION_LANG = 'captionLang',
	BACKGROUND = 'virtualBg',
	TAB_ID = 'tabId',
	ACTIVE_TABS = 'activeTabs'
}

export const PERSISTENT_KEYS: StorageKeys[] = [
	StorageKeys.VIDEO_DEVICE,
	StorageKeys.AUDIO_DEVICE,
	StorageKeys.LANG,
	StorageKeys.CAPTION_LANG,
	StorageKeys.BACKGROUND
];

export const SESSION_KEYS: StorageKeys[] = [StorageKeys.TAB_ID];

export const TAB_MANAGEMENT_KEYS: StorageKeys[] = [StorageKeys.TAB_ID, StorageKeys.ACTIVE_TABS];

// Data that should be unique per tab (stored in localStorage with tabId prefix)
export const TAB_SPECIFIC_KEYS: StorageKeys[] = [
	StorageKeys.PARTICIPANT_NAME,
	StorageKeys.MICROPHONE_ENABLED,
	StorageKeys.CAMERA_ENABLED,
	StorageKeys.LANG,
	StorageKeys.CAPTION_LANG,
	StorageKeys.BACKGROUND,
	StorageKeys.VIDEO_DEVICE,
	StorageKeys.AUDIO_DEVICE
];

// Data that should be truly persistent and shared between tabs
export const SHARED_PERSISTENT_KEYS: StorageKeys[] = [];

export const STORAGE_PREFIX = 'ovComponents-';
