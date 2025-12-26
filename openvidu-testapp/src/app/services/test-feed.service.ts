import { Injectable } from "@angular/core";
import { Subject } from "rxjs";

import * as stringify from "json-stringify-safe";

import { Event } from "openvidu-browser-v2compatibility";

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

  cleanEvent(event: any): string {
    // 1. GLOBAL BLOCKLIST
    const globalBlocklist = new Set([
      "ee",
      "openvidu",
      "userHandlerArrowHandler",
      "handlers",
      "reliableMessageBuffer",
      "socket",
      "loggerOptions",
      "log",
      "closingLock",
      "connectionLock",
      "offerLock",
      "remoteOfferLock",
      "disconnectLock",
      "dataProcessLock",
      "taskMutex",
      "requestQueue",
      "mutex",
      "lock",
      "publisherConnectionPromise",
      "signalConnectedFuture",
      "sifTrailer",
      "enabledCodecs",
      "supportedCodecs",
      "enabledPublishCodecs",
      "enabledPublishVideoCodecs",
      "videoCaptureDefaults",
      "audioCaptureDefaults",
      "publishDefaults",
      "reconnectPolicy",
      "permissions",
      "engine",
      "client",
      "signalClient",
      "pcManager",
      "ws",
      "internalEmitter",
      "publicEmmiter",
      "codecs",
      "layers",
      "encodings",
      "prevStats",
      "monitorInterval",
      "volumeMap",
      "midToTrackId",
      "audioContext",
      "rtcConfig",
      "options",
      "connectOptions",
    ]);

    // 2. SCOPED BLOCKLIST (Parent -> Child removal)
    const scopedBlocklist: Record<string, Set<string>> = {
      session: new Set(["room", "openvidu"]),
      target: new Set(["stream"]),
      streamManagers: new Set(["stream"])
    };

    const seen = new WeakSet();

    // 3. RECURSIVE WALKER
    const traverse = (
      current: any,
      nodeName: string | null,
      parentName: string | null
    ): any => {
      // JSON.stringify cannot handle BigInt. Convert it to string.
      if (typeof current === "bigint") {
        return current.toString();
      }

      // A. Handle Primitives
      if (typeof current !== "object" || current === null) {
        return current;
      }

      // B. Handle Circular References
      if (seen.has(current)) {
        return undefined;
      }
      seen.add(current);

      // C. Handle Arrays
      if (Array.isArray(current)) {
        return current
          .map((item) => traverse(item, null, nodeName))
          .filter((item) => item !== undefined);
      }

      // D. Handle Objects
      const copy: any = {};
      const effectiveParent = nodeName || parentName;

      for (const [childKey, childValue] of Object.entries(current)) {
        // Rule 1: Global Blocklist and Private Properties (start with _)
        if (globalBlocklist.has(childKey) || childKey.startsWith("_")) {
          continue;
        }

        // Rule 2: Scoped Blocklist
        if (
          effectiveParent &&
          scopedBlocklist[effectiveParent]?.has(childKey)
        ) {
          continue;
        }

        // Rule 3: Metadata parsing
        if (childKey === "metadata" && typeof childValue === "string") {
          try {
            const parsed = JSON.parse(childValue);
            copy[childKey] = {
              role: parsed.role,
              clientData: parsed.clientData,
            };
            continue;
          } catch {
            /* ignore */
          }
        }

        const cleanedValue = traverse(childValue, childKey, nodeName);
        if (cleanedValue !== undefined) {
          copy[childKey] = cleanedValue;
        }
      }

      return copy;
    };

    const cleanedObject = traverse(event, "root", null);
    return JSON.stringify(cleanedObject);
  }
}
