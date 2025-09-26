/**
 * Represents the possible theme modes for OpenVidu components
 * @internal
 */
export enum OpenViduThemeMode {
	Light = 'light',
	Dark = 'dark',
	CLASSIC = 'classic'
}

/**
 * Interface representing the complete set of theme variables for OpenVidu components
 * @internal
 */
export interface OpenViduThemeVariables {
	// === Core Background Colors ===
	'--ov-background-color'?: string;
	'--ov-surface-color'?: string;
	'--ov-surface-container-color'?: string;
	'--ov-surface-container-high-color'?: string;

	// === Action Colors ===
	'--ov-primary-action-color'?: string;
	'--ov-primary-action-color-lighter'?: string;
	'--ov-secondary-action-color'?: string;
	'--ov-accent-action-color'?: string;

	// === State Colors ===
	'--ov-error-color'?: string;
	'--ov-warn-color'?: string;
	'--ov-success-color'?: string;

	// === Text Colors ===
	'--ov-text-primary-color'?: string;
	'--ov-text-surface-color'?: string;
	'--ov-text-secondary-color'?: string;
	'--ov-text-disabled-color'?: string;

	// === Interactive States ===
	'--ov-hover-color'?: string;
	'--ov-active-color'?: string;
	'--ov-focus-color'?: string;
	'--ov-disabled-background'?: string;
	'--ov-disabled-border-color'?: string;

	// === Input & Form Colors ===
	'--ov-input-background'?: string;
	'--ov-border-color'?: string;
	'--ov-border-focus-color'?: string;

	// === Layout & Spacing ===
	'--ov-toolbar-buttons-radius'?: string;
	'--ov-leave-button-radius'?: string;
	'--ov-video-radius'?: string;
	'--ov-surface-radius'?: string;
	'--ov-input-radius'?: string;

	// === Special Colors ===
	'--ov-recording-color'?: string;
	'--ov-broadcasting-color'?: string;
	'--ov-selection-color'?: string;
	'--ov-selection-color-btn'?: string;
	'--ov-activity-status-color'?: string;

	// === Video/Media Specific ===
	'--ov-video-background'?: string;
	'--ov-audio-wave-color'?: string;
	'--ov-captions-height'?: string;

	// Allow for custom variables
	[key: string]: string | undefined;
}

/**
 * Predefined theme configurations
 * @internal
 */
export const OPENVIDU_COMPONENTS_LIGHT_THEME: OpenViduThemeVariables = {
	'--ov-background-color': '#f5f5f5',
	'--ov-surface-color': '#ffffff',
	'--ov-surface-container-color': '#f8f9fa',
	'--ov-surface-container-high-color': '#f0f0f0',
	'--ov-primary-action-color': '#e6e1e1',
	'--ov-primary-action-color-lighter': '#f3f3f3',
	'--ov-secondary-action-color': '#e7e7e7ff',
	'--ov-accent-action-color': '#bddfe7',
	'--ov-error-color': '#dc3545',
	'--ov-warn-color': '#eea300',
	'--ov-success-color': '#28a745',
	'--ov-text-primary-color': '#4e4f50',
	'--ov-text-surface-color': '#212529',
	'--ov-text-secondary-color': '#6c757d',
	'--ov-text-disabled-color': '#adb5bd',
	'--ov-hover-color': '#f8f9fa',
	'--ov-active-color': '#4285f4',
	'--ov-focus-color': '#4285f4',
	'--ov-disabled-background': '#f8f9fa',
	'--ov-disabled-border-color': '#dee2e6',
	'--ov-input-background': '#ffffff',
	'--ov-border-color': '#ced4da',
	'--ov-border-focus-color': '#4285f4',
	'--ov-activity-status-color': '#c8cdd6',
	'--ov-broadcasting-color': '#8837f1',
	'--ov-video-background': '#000000',

	'--ov-toolbar-buttons-radius': '50%',
	'--ov-leave-button-radius': '10px',
	'--ov-video-radius': '5px',
	'--ov-surface-radius': '5px'
};

/**
 * Predefined dark theme configuration
 * @internal
 */
export const OPENVIDU_COMPONENTS_DARK_THEME: OpenViduThemeVariables = {
	'--ov-background-color': '#1f2020',
	'--ov-surface-color': '#2d2d2d',
	'--ov-surface-container-color': '#3a3a3a',
	'--ov-surface-container-high-color': '#474747',
	'--ov-primary-action-color': '#4a4e4e',
	'--ov-primary-action-color-lighter': '#c2c2c2',
	'--ov-secondary-action-color': '#5c5c5cff',
	'--ov-accent-action-color': '#009ab9',
	'--ov-error-color': '#dc3545',
	'--ov-warn-color': '#eea300',
	'--ov-success-color': '#69db7c',
	'--ov-text-primary-color': '#ffffff',
	'--ov-text-surface-color': '#f0f0f0',
	'--ov-text-secondary-color': '#b3b3b3',
	'--ov-text-disabled-color': '#666666',
	'--ov-hover-color': '#4a4a4a',
	'--ov-active-color': '#4285f4',
	'--ov-focus-color': '#5294ff',
	'--ov-disabled-background': '#3a3a3a',
	'--ov-disabled-border-color': '#555555',
	'--ov-input-background': '#3a3a3a',
	'--ov-border-color': '#555555',
	'--ov-border-focus-color': '#5294ff',
	'--ov-activity-status-color': '#c8cdd6',
	'--ov-broadcasting-color': '#9d5af3',
	'--ov-video-background': '#000000',

	'--ov-toolbar-buttons-radius': '50%',
	'--ov-leave-button-radius': '10px',
	'--ov-video-radius': '5px',
	'--ov-surface-radius': '5px'
};
