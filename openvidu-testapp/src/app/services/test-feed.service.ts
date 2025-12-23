import { Injectable } from "@angular/core";
import { Subject } from "rxjs";

import * as stringify from "json-stringify-safe";

import {
  // Base classes
  Session,
  Stream,
  Connection,
  StreamManager,
  Publisher,
  Subscriber,

  // Base Event
  Event,

  // Session Events
  ConnectionEvent,
  SessionDisconnectedEvent,
  SignalEvent,
  StreamEvent,
  StreamPropertyChangedEvent,
  ConnectionPropertyChangedEvent, // Missed previously
  NetworkQualityLevelChangedEvent, // Missed previously
  SpeechToTextEvent, // Missed previously
  ExceptionEvent,

  // StreamManager / Publisher / Subscriber Events
  StreamManagerEvent,
  VideoElementEvent,
  PublisherSpeakingEvent,
  RecordingEvent,
  FilterEvent, // Missed previously
} from "openvidu-browser-v2compatibility";

const API_ALLOWLIST = new Map<any, string[]>([
  // ===========================================================================
  // 1. CORE ENTITIES
  // ===========================================================================

  // https://docs.openvidu.io/en/2.32.0/api/openvidu-browser/classes/Session.html
  [Session, ["sessionId", "connection", "capabilities", "streamManagers"]],

  // https://docs.openvidu.io/en/2.32.0/api/openvidu-browser/classes/Connection.html
  [Connection, ["connectionId", "creationTime", "data", "record", "role"]],

  // https://docs.openvidu.io/en/2.32.0/api/openvidu-browser/classes/Stream.html
  [
    Stream,
    [
      "streamId",
      "creationTime",
      "hasAudio",
      "hasVideo",
      "audioActive",
      "videoActive",
      "typeOfVideo",
      "frameRate",
      "videoDimensions",
      "connection",
      "filter",
    ],
  ],

  // https://docs.openvidu.io/en/2.32.0/api/openvidu-browser/classes/StreamManager.html
  [StreamManager, ["stream", "id", "remote", "videos"]],

  // https://docs.openvidu.io/en/2.32.0/api/openvidu-browser/classes/Publisher.html
  [Publisher, ["stream", "id", "remote", "videos", "accessAllowed"]],

  // https://docs.openvidu.io/en/2.32.0/api/openvidu-browser/classes/Subscriber.html
  [Subscriber, ["stream", "id", "remote", "videos"]],

  // ===========================================================================
  // 2. BASE EVENT
  // ===========================================================================
  // These are merged into all specific events
  // https://docs.openvidu.io/en/2.32.0/api/openvidu-browser/classes/Event.html
  [Event, ["type", "cancelable", "target"]],

  // ===========================================================================
  // 3. SPECIFIC EVENTS (Alphabetical Order)
  // ===========================================================================

  // https://docs.openvidu.io/en/2.32.0/api/openvidu-browser/classes/ConnectionEvent.html
  [ConnectionEvent, ["connection", "reason"]],

  // https://docs.openvidu.io/en/2.32.0/api/openvidu-browser/classes/ConnectionPropertyChangedEvent.html
  [
    ConnectionPropertyChangedEvent,
    ["connection", "changedProperty", "oldValue", "newValue", "reason"],
  ],

  // https://docs.openvidu.io/en/2.32.0/api/openvidu-browser/classes/ExceptionEvent.html
  [ExceptionEvent, ["name", "message", "data"]],

  // https://docs.openvidu.io/en/2.32.0/api/openvidu-browser/classes/FilterEvent.html
  [FilterEvent, ["filter", "eventType", "data"]],

  // https://docs.openvidu.io/en/2.32.0/api/openvidu-browser/classes/NetworkQualityLevelChangedEvent.html
  [NetworkQualityLevelChangedEvent, ["connection", "newValue", "oldValue"]],

  // https://docs.openvidu.io/en/2.32.0/api/openvidu-browser/classes/PublisherSpeakingEvent.html
  [PublisherSpeakingEvent, ["connection", "streamId", "reason"]],

  // https://docs.openvidu.io/en/2.32.0/api/openvidu-browser/classes/RecordingEvent.html
  [RecordingEvent, ["id", "name", "reason"]],

  // https://docs.openvidu.io/en/2.32.0/api/openvidu-browser/classes/SessionDisconnectedEvent.html
  [SessionDisconnectedEvent, ["reason"]],

  // https://docs.openvidu.io/en/2.32.0/api/openvidu-browser/classes/SignalEvent.html
  [SignalEvent, ["type", "data", "from"]],

  // https://docs.openvidu.io/en/2.32.0/api/openvidu-browser/classes/SpeechToTextEvent.html
  [SpeechToTextEvent, ["connection", "text", "reason", "timestamp", "raw"]],

  // https://docs.openvidu.io/en/2.32.0/api/openvidu-browser/classes/StreamEvent.html
  [StreamEvent, ["stream", "reason"]],

  // https://docs.openvidu.io/en/2.32.0/api/openvidu-browser/classes/StreamManagerEvent.html
  [StreamManagerEvent, ["stream", "reason"]],

  // https://docs.openvidu.io/en/2.32.0/api/openvidu-browser/classes/StreamPropertyChangedEvent.html
  [
    StreamPropertyChangedEvent,
    ["stream", "changedProperty", "oldValue", "newValue", "reason"],
  ],

  // https://docs.openvidu.io/en/2.32.0/api/openvidu-browser/classes/VideoElementEvent.html
  [VideoElementEvent, ["element"]],
]);

@Injectable()
export class TestFeedService {
  lastEvent: { user: number; event: Event };
  newLastEvent$ = new Subject<any>();

  constructor() {}

  getLastEvent() {
    return this.lastEvent;
  }

  pushNewEvent({ user: number, event: Event }) {
    this.lastEvent = { user: number, event: Event };
    this.newLastEvent$.next(this.lastEvent);
  }

  stringifyEventNoCircularDependencies(event: Event): string {
    return this.cleanEvent(event);
  }

  cleanEvent(root: any): string {
    const seen = new WeakSet();

    const getAllowedKeys = (obj: any): string[] | null => {
      for (const [ClassConstructor, keys] of API_ALLOWLIST.entries()) {
        if (obj instanceof ClassConstructor) {
          // If instance of specific Event, merge with base Event keys
          if (obj instanceof Event && ClassConstructor !== Event) {
            return [...(API_ALLOWLIST.get(Event) || []), ...keys];
          }
          return keys;
        }
      }
      return null;
    };

    const traverse = (current: any): any => {
      if (current === null || current === undefined) return current;
      if (typeof current === "bigint") return current.toString();
      if (typeof current !== "object") return current;

      if (seen.has(current)) return undefined;
      seen.add(current);

      if (Array.isArray(current)) {
        return current.map(traverse).filter((x) => x !== undefined);
      }

      const allowedKeys = getAllowedKeys(current);
      const copy: any = {};

      if (allowedKeys) {
        // Known Class: Filter strictly
        for (const key of allowedKeys) {
          if (key in current) {
            const val = traverse(current[key]);
            if (val !== undefined) copy[key] = val;
          }
        }
      } else {
        // Plain Object: Copy recursive
        for (const [key, value] of Object.entries(current)) {
          const val = traverse(value);
          if (val !== undefined) copy[key] = val;
        }
      }

      return copy;
    };

    return JSON.stringify(traverse(root));
  }
}
