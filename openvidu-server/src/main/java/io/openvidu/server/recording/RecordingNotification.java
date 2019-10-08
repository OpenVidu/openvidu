package io.openvidu.server.recording;

/**
 * Defines which users should receive the Session recording notifications on the
 * client side (recordingStarted, recordingStopped)
 * 
 * @author Pablo Fuente (pablofuenteperez@gmail.com)
 */
public enum RecordingNotification {

	/*
	 * No user of the session will receive recording events
	 */
	none,

	/*
	 * Only users with role MODERATOR will receive recording events
	 */
	moderator,

	/*
	 * Users with role MODERATOR or PUBLISHER will receive recording events
	 */
	publisher_moderator,

	/*
	 * All users of to the session will receive recording events
	 */
	all

}
