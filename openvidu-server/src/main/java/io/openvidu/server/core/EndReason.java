/*
 * (C) Copyright 2017-2022 OpenVidu (https://openvidu.io)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

package io.openvidu.server.core;

public enum EndReason {

	/**
	 * A user called the RPC operation to unsubscribe from a remote stream. Applies
	 * to event webrtcConnectionDestroyed
	 */
	unsubscribe,

	/**
	 * A user called the RPC operation to unpublish a local stream. Applies to event
	 * webrtcConnectionDestroyed
	 */
	unpublish,

	/**
	 * A user called the RPC operation to leave the session. Applies to events
	 * webrtcConnectionDestroyed and participantLeft. Can trigger other events with
	 * lastParticipantLeft
	 */
	disconnect,

	/**
	 * A user called the RPC operation to force the unpublishing of a remote stream.
	 * Applies to event webrtcConnectionDestroyed
	 */
	forceUnpublishByUser,

	/**
	 * The server application called the REST operation to force the unpublishing of
	 * a user's stream. Applies to event webrtcConnectionDestroyed
	 */
	forceUnpublishByServer,

	/**
	 * A user called the RPC operation to force the disconnection of a remote user.
	 * Applies to events webrtcConnectionDestroyed and participantLeft. Can trigger
	 * other events with lastParticipantLeft
	 */
	forceDisconnectByUser,

	/**
	 * The server application called the REST operation to force the disconnection
	 * of a user. Applies to events webrtcConnectionDestroyed and participantLeft.
	 * Can trigger other events with lastParticipantLeft
	 */
	forceDisconnectByServer,

	/**
	 * The last participant left the session, which caused the session to be closed.
	 * Applies to events webrtcConnectionDestroyed, participantLeft,
	 * recordingStatusChanged and sessionDestroyed. Can be triggered from other
	 * events with other end reasons (disconnect, forceDisconnectByUser,
	 * forceDisconnectByServer, networkDisconnect)
	 */
	lastParticipantLeft,

	/**
	 * The server application called the REST operation to stop a recording. Applies
	 * to event recordingStatusChanged
	 */
	recordingStoppedByServer,

	/**
	 * The server application called the REST operation to close a session. Applies
	 * to events webrtcConnectionDestroyed, participantLeft, recordingStatusChanged
	 * and sessionDestroyed
	 */
	sessionClosedByServer,

	/**
	 * A user left the session because of a network disconnection. Applies to
	 * webrtcConnectionDestroyed and participantLeft. Can trigger other events with
	 * lastParticipantLeft
	 */
	networkDisconnect,

	/**
	 * A media server disconnected. This is reserved for Media Nodes being
	 * gracefully removed from an OpenVidu Pro cluster. Applies to events
	 * webrtcConnectionDestroyed, participantLeft, recordingStatusChanged and
	 * sessionDestroyed
	 */
	mediaServerDisconnect,

	/**
	 * A media server disconnected, and a new one automatically reconnected. All of
	 * the media endpoints were destroyed in the process. Applies to events
	 * webrtcConnectionDestroyed and recordingStatusChanged
	 */
	mediaServerReconnect,

	/**
	 * A node has crashed. For now this means a Media Node has crashed. Applies to
	 * events webrtcConnectionDestroyed, participantLeft, recordingStatusChanged and
	 * sessionDestroyed
	 */
	nodeCrashed,

	/**
	 * OpenVidu Server has gracefully stopped. This is reserved for OpenVidu Pro
	 * restart operation. Applies to events webrtcConnectionDestroyed,
	 * participantLeft, recordingStatusChanged and sessionDestroyed
	 */
	openviduServerStopped,

	/**
	 * A recording has been stopped automatically
	 * (https://docs.openvidu.io/en/stable/advanced-features/recording/#automatic-stop-of-recordings).
	 * Applies to event recordingStatusChanged
	 */
	automaticStop

}
