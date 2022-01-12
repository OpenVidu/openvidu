#!/bin/bash
set -e
SEARCH_STRING_1="<K extends keyof SessionEventMap>(type: K,"
REPLACE_STRING_1="<K extends keyof SessionEventMap>(type: K | string,"
SEARCH_STRING_2='\[key: `signal:\${string}`\]: SignalEvent;'
sed -i "s~${SEARCH_STRING_1}~${REPLACE_STRING_1}~g" ts4.4/lib/OpenVidu/Session.d.ts
sed -i "/${SEARCH_STRING_2}/d" ts4.4/lib/OpenViduInternal/Events/EventMap/SessionEventMap.d.ts