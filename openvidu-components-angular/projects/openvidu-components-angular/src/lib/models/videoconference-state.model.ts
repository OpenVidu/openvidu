/**
 * Enum representing the possible states of the videoconference component
 */
export enum VideoconferenceState {
	/**
	 * Initial state when the component is loading
	 */
	INITIALIZING = 'INITIALIZING',

	/**
	 * Prejoin page is being shown to the user
	 */
	PREJOIN_SHOWN = 'PREJOIN_SHOWN',

	/**
	 * User has initiated the join process, waiting for token
	 */
	JOINING = 'JOINING',

	/**
	 * Token received and room is ready to connect
	 */
	READY_TO_CONNECT = 'READY_TO_CONNECT',

	/**
	 * Successfully connected to the room
	 */
	CONNECTED = 'CONNECTED',

	/**
	 * Disconnected from the room
	 */
	DISCONNECTED = 'DISCONNECTED',

	/**
	 * Error state
	 */
	ERROR = 'ERROR'
}

/**
 * Interface representing the state information of the videoconference component
 */
export interface VideoconferenceStateInfo {
	/**
	 * Current state of the videoconference
	 */
	state: VideoconferenceState;

	/**
	 * Whether prejoin page should be visible
	 */
	showPrejoin: boolean;

	/**
	 * Whether room is ready for connection
	 */
	isRoomReady: boolean;

	/**
	 * Whether user is connected to the room
	 */
	isConnected: boolean;

	/**
	 * Whether audio devices are available
	 */
	hasAudioDevices: boolean;

	/**
	 * Whether video devices are available
	 */
	hasVideoDevices: boolean;

	/**
	 * Whether user has initiated the join process
	 */
	hasUserInitiatedJoin: boolean;

	/**
	 * Whether prejoin was shown to the user at least once
	 */
	wasPrejoinShown: boolean;

	/**
	 * Whether the component is in loading state
	 */
	isLoading: boolean;

	/**
	 * Error information if any
	 */
	error?: {
		hasError: boolean;
		message?: string;
		tokenError?: any;
	};
}
