import {
  ConnectionQuality,
  DataPacket_Kind,
  LocalTrackPublication,
  LocalVideoTrack,
  Participant,
  ParticipantEvent,
  RemoteTrack,
  RemoteTrackPublication,
  SubscriptionError,
  Track,
  TrackEvent,
  TrackPublication,
} from 'livekit-client';
import type { TranscriptionSegment, ChatMessage } from 'livekit-client';
import { ParticipantPermission } from 'livekit-server-sdk';

export type ParticipantOnEvent = (
  eventType: ParticipantEvent,
  eventContent: any,
  eventDescription: string
) => void;

export type TrackOnEvent = (
  eventType: TrackEvent,
  eventContent: any,
  eventDescription: string
) => void;

/**
 * Registers ALL participant event listeners on the given participant.
 * Returns the listener map for later cleanup/replacement.
 */
export function registerParticipantEventListeners(
  participant: Participant,
  onEvent: ParticipantOnEvent,
  decoder: TextDecoder
): Map<string, (...args: any[]) => void> {
  const listeners = new Map<string, (...args: any[]) => void>();

  const reg = (event: ParticipantEvent, listener: (...args: any[]) => void) => {
    participant.addListener(event as any, listener as any);
    listeners.set(event, listener);
  };

  reg(ParticipantEvent.TrackPublished, (publication: RemoteTrackPublication) => {
    onEvent(ParticipantEvent.TrackPublished, { publication }, publication.source);
  });

  reg(ParticipantEvent.TrackSubscribed, (track: RemoteTrack, publication: RemoteTrackPublication) => {
    onEvent(ParticipantEvent.TrackSubscribed, { track, publication }, publication.source);
  });

  reg(ParticipantEvent.TrackSubscriptionFailed, (trackSid: string, reason?: SubscriptionError) => {
    onEvent(
      ParticipantEvent.TrackSubscriptionFailed,
      { trackSid, reason },
      trackSid + ' . Reason: ' + (reason ? SubscriptionError[reason] : reason)
    );
  });

  reg(ParticipantEvent.TrackUnpublished, (publication: RemoteTrackPublication) => {
    onEvent(ParticipantEvent.TrackUnpublished, { publication }, publication.source);
  });

  reg(ParticipantEvent.TrackUnsubscribed, (track: RemoteTrack, publication: RemoteTrackPublication) => {
    onEvent(ParticipantEvent.TrackUnsubscribed, { track, publication }, track.source);
  });

  reg(ParticipantEvent.TrackMuted, (publication: TrackPublication) => {
    onEvent(ParticipantEvent.TrackMuted, { publication }, publication.source);
  });

  reg(ParticipantEvent.TrackUnmuted, (publication: TrackPublication) => {
    onEvent(ParticipantEvent.TrackUnmuted, { publication }, publication.source);
  });

  reg(ParticipantEvent.LocalTrackPublished, (publication: LocalTrackPublication) => {
    onEvent(ParticipantEvent.LocalTrackPublished, { publication }, publication.source);
  });

  reg(ParticipantEvent.LocalTrackUnpublished, (publication: LocalTrackPublication) => {
    onEvent(ParticipantEvent.LocalTrackUnpublished, { publication }, publication.source);
  });

  reg(ParticipantEvent.ParticipantMetadataChanged, (prevMetadata: string | undefined) => {
    onEvent(
      ParticipantEvent.ParticipantMetadataChanged,
      { prevMetadata },
      `previous: ${prevMetadata}, new: ${participant.metadata}`
    );
  });

  reg(ParticipantEvent.ParticipantNameChanged, (name: string) => {
    onEvent(ParticipantEvent.ParticipantNameChanged, { name }, `${name}`);
  });

  reg(ParticipantEvent.DataReceived, (payload: Uint8Array, kind: DataPacket_Kind) => {
    let decodedPayload = decoder.decode(payload);
    decodedPayload += ` (kind: ${DataPacket_Kind[kind]})`;
    onEvent(ParticipantEvent.DataReceived, { payload: decodedPayload, kind }, decodedPayload);
  });

  reg(ParticipantEvent.IsSpeakingChanged, (speaking: boolean) => {
    onEvent(ParticipantEvent.IsSpeakingChanged, { speaking }, `${speaking}`);
  });

  reg(ParticipantEvent.ConnectionQualityChanged, (connectionQuality: ConnectionQuality) => {
    onEvent(ParticipantEvent.ConnectionQualityChanged, { connectionQuality }, `${connectionQuality}`);
  });

  reg(
    ParticipantEvent.TrackStreamStateChanged,
    (publication: RemoteTrackPublication, streamState: Track.StreamState) => {
      onEvent(
        ParticipantEvent.TrackStreamStateChanged,
        { publication, streamState },
        `${publication.source}: ${streamState}`
      );
    }
  );

  reg(
    ParticipantEvent.TrackSubscriptionPermissionChanged,
    (publication: RemoteTrackPublication, status: TrackPublication.PermissionStatus) => {
      onEvent(
        ParticipantEvent.TrackSubscriptionPermissionChanged,
        { publication, status },
        `${publication.source}: ${status}`
      );
    }
  );

  reg(ParticipantEvent.MediaDevicesError, (error: Error) => {
    onEvent(ParticipantEvent.MediaDevicesError, { error }, `${error.message}`);
  });

  reg(ParticipantEvent.ParticipantPermissionsChanged, (prevPermissions?: ParticipantPermission) => {
    onEvent(
      ParticipantEvent.ParticipantPermissionsChanged,
      { prevPermissions },
      `previous: ${prevPermissions}, new: ${JSON.stringify(participant.permissions)}`
    );
  });

  reg(
    ParticipantEvent.TrackSubscriptionStatusChanged,
    (publication: RemoteTrackPublication, status: TrackPublication.SubscriptionStatus) => {
      onEvent(
        ParticipantEvent.TrackSubscriptionStatusChanged,
        { publication, status },
        `${publication.source}: ${status}`
      );
    }
  );

  reg(ParticipantEvent.LocalTrackSubscribed, (trackPublication: LocalTrackPublication) => {
    onEvent(ParticipantEvent.LocalTrackSubscribed, { trackPublication }, trackPublication.source);
  });

  reg(
    ParticipantEvent.LocalTrackCpuConstrained,
    (track: LocalVideoTrack, publication: LocalTrackPublication) => {
      onEvent(ParticipantEvent.LocalTrackCpuConstrained, { track, publication }, publication.source);
    }
  );

  reg(ParticipantEvent.SipDTMFReceived, (dtmf: any) => {
    onEvent(ParticipantEvent.SipDTMFReceived, { dtmf }, JSON.stringify(dtmf));
  });

  reg(
    ParticipantEvent.TranscriptionReceived,
    (transcription: TranscriptionSegment[], publication?: TrackPublication) => {
      onEvent(
        ParticipantEvent.TranscriptionReceived,
        { transcription, publication },
        `segments: ${transcription.length}, source: ${publication?.source ?? 'unknown'}`
      );
    }
  );

  reg(ParticipantEvent.AudioStreamAcquired, () => {
    onEvent(ParticipantEvent.AudioStreamAcquired, {}, '');
  });

  reg(ParticipantEvent.AttributesChanged, (changedAttributes: Record<string, string>) => {
    onEvent(ParticipantEvent.AttributesChanged, { changedAttributes }, JSON.stringify(changedAttributes));
  });

  reg(ParticipantEvent.ChatMessage, (msg: ChatMessage) => {
    onEvent(ParticipantEvent.ChatMessage, { msg }, msg.message);
  });

  reg(ParticipantEvent.Active, () => {
    onEvent(ParticipantEvent.Active, {}, '');
  });

  return listeners;
}

/**
 * Removes all listeners in the given map from the target emitter.
 */
export function removeAllManagedListeners(
  target: any,
  listeners: Map<string, (...args: any[]) => void>
) {
  for (const [event, listener] of listeners) {
    target.removeListener(event, listener);
  }
  listeners.clear();
}

/**
 * Registers ALL track event listeners on the given track.
 * Returns the listener map for later cleanup/replacement.
 */
export function registerTrackEventListeners(
  track: Track,
  onEvent: TrackOnEvent
): Map<string, (...args: any[]) => void> {
  const listeners = new Map<string, (...args: any[]) => void>();

  const reg = (event: TrackEvent, listener: (...args: any[]) => void) => {
    track.addListener(event as any, listener as any);
    listeners.set(event, listener);
  };

  reg(TrackEvent.Message, () => {
    onEvent(TrackEvent.Message, {}, track.source);
  });

  reg(TrackEvent.Muted, () => {
    onEvent(TrackEvent.Muted, {}, track.source);
  });

  reg(TrackEvent.Unmuted, () => {
    onEvent(TrackEvent.Unmuted, {}, track.source);
  });

  reg(TrackEvent.Restarted, () => {
    onEvent(TrackEvent.Restarted, {}, track.source);
  });

  reg(TrackEvent.Ended, () => {
    onEvent(TrackEvent.Ended, {}, track.source);
  });

  reg(TrackEvent.CpuConstrained, () => {
    onEvent(TrackEvent.CpuConstrained, {}, track.source);
  });

  reg(TrackEvent.UpdateSettings, () => {
    onEvent(TrackEvent.UpdateSettings, {}, track.source);
  });

  reg(TrackEvent.UpdateSubscription, () => {
    onEvent(TrackEvent.UpdateSubscription, {}, track.source);
  });

  reg(TrackEvent.AudioPlaybackStarted, () => {
    onEvent(TrackEvent.AudioPlaybackStarted, {}, track.source);
  });

  reg(TrackEvent.AudioPlaybackFailed, (error?: Error) => {
    onEvent(TrackEvent.AudioPlaybackFailed, { error }, `${track.source} ${error?.message ?? ''}`);
  });

  reg(TrackEvent.AudioSilenceDetected, () => {
    onEvent(TrackEvent.AudioSilenceDetected, {}, track.source);
  });

  reg(TrackEvent.VisibilityChanged, (visible: boolean) => {
    onEvent(TrackEvent.VisibilityChanged, { visible, track }, `${track.source} is visible: ${visible}`);
  });

  reg(TrackEvent.VideoDimensionsChanged, (dimensions: Track.Dimensions) => {
    onEvent(
      TrackEvent.VideoDimensionsChanged,
      { dimensions, track },
      `${track.source} ${JSON.stringify(dimensions)}`
    );
  });

  reg(TrackEvent.VideoPlaybackStarted, () => {
    onEvent(TrackEvent.VideoPlaybackStarted, {}, track.source);
  });

  reg(TrackEvent.VideoPlaybackFailed, (error?: Error) => {
    onEvent(TrackEvent.VideoPlaybackFailed, { error }, `${track.source} ${error?.message ?? ''}`);
  });

  reg(TrackEvent.ElementAttached, (element: HTMLMediaElement) => {
    onEvent(TrackEvent.ElementAttached, { element }, track.source);
  });

  reg(TrackEvent.ElementDetached, (element: HTMLMediaElement) => {
    onEvent(TrackEvent.ElementDetached, { element }, track.source);
  });

  reg(TrackEvent.UpstreamPaused, () => {
    onEvent(TrackEvent.UpstreamPaused, {}, track.source);
  });

  reg(TrackEvent.UpstreamResumed, () => {
    onEvent(TrackEvent.UpstreamResumed, {}, track.source);
  });

  reg(TrackEvent.TrackProcessorUpdate, (processor?: any) => {
    onEvent(TrackEvent.TrackProcessorUpdate, { processor }, track.source);
  });

  reg(TrackEvent.AudioTrackFeatureUpdate, (_track: any, feature: any, enabled: boolean) => {
    onEvent(
      TrackEvent.AudioTrackFeatureUpdate,
      { feature, enabled },
      `${track.source} feature: ${feature}, enabled: ${enabled}`
    );
  });

  reg(TrackEvent.TimeSyncUpdate, (update: { timestamp: number; rtpTimestamp: number }) => {
    onEvent(TrackEvent.TimeSyncUpdate, { update }, `${track.source} timestamp: ${update.timestamp}`);
  });

  reg(TrackEvent.PreConnectBufferFlushed, (buffer: any) => {
    onEvent(TrackEvent.PreConnectBufferFlushed, { buffer }, track.source);
  });

  return listeners;
}
