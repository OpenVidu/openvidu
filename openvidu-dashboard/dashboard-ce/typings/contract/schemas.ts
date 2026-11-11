import {
	BrowserFamily,
	ClientSdk,
	ClosedBy,
	Collection,
	ConnectionType,
	DisconnectReason,
	EgressOutputKind,
	EgressSourceType,
	EgressStatus,
	EgressStreamStatus,
	EgressType,
	EncryptionType,
	IngressInputType,
	IngressSessionStatus,
	IngressStatus,
	MigrationState,
	OsFamily,
	ParticipantKind,
	ParticipantKindDetail,
	ParticipantStatus,
	RoomEndReason,
	RoomSizeRange,
	RoomStatus,
	RoomTopology,
	RtcEngine,
	SIZED_ROOM_TOPOLOGIES,
	StatsDetail,
	StatsDirection,
	StoredEventType,
	SubscriptionStatus,
	TrackSource,
	TrackStatus,
	TrackType,
	VideoQuality
} from '../src/index.js';
import {
	anyObject,
	arr,
	bool,
	type BsonSchema,
	counts,
	date,
	double,
	int,
	long,
	nullable,
	obj,
	oneOfValues,
	patternCounts,
	req,
	str
} from './schema-builder.js';

const SCOPE_PATTERN = '^(global|node:[^:]+)$';
/** A media node label: the characters a `node:<label>` analytics scope accepts. */
const MEDIA_NODE_PATTERN = '^[A-Za-z0-9_.-]{1,128}$';
const ROLLUP_ID_PATTERN = '^(global|node:[^:]+):[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:00Z$';
const API_METHOD_PATTERN = '^[A-Za-z0-9]+_[A-Za-z0-9]+$';

const entityBase = {
	schemaVersion: req(int('SCHEMA_VERSION of the writer that last wrote the document')),
	expiresAt: req(nullable(date('closedAt + retention once closed; null while open')))
};

const internal = anyObject('Writer bookkeeping; never read by the dashboard');
const mediaStatsMark = bool(
	'Only false: the node that created the entity does not report media statistics; absent otherwise'
);
const mediaNodeMark: BsonSchema = {
	...str('Media node label of the server that hosts the entity; absent when it has none'),
	pattern: MEDIA_NODE_PATTERN
};

const closedBy = oneOfValues(ClosedBy);

const bytes = obj({ up: req(long()), down: req(long()) });

const quality = obj({
	scoreSum: req(double()),
	scoreCount: req(int()),
	minScore: double(),
	poor: req(int('Samples with score below 2.06')),
	lost: req(int('Samples with score below 1.25'))
});

const layerStats = obj({ layer: req(int()), bytes: req(long()), packets: req(int()), frames: req(int()) });

const finalStatsFields = {
	bytes: req(long()),
	packets: req(int()),
	packetsLost: req(int()),
	packetLossPct: req(double()),
	nacks: req(int()),
	plis: req(int()),
	firs: req(int()),
	rttMaxMs: req(int()),
	jitterMaxMs: req(double()),
	durationMs: req(long())
};

const rooms = obj({
	_id: req(str('Room SID')),
	name: req(str()),
	nameLower: req(str()),
	status: req(oneOfValues(RoomStatus)),
	createdAt: req(date()),
	endedAt: date(),
	durationMs: long(),
	endReason: oneOfValues(RoomEndReason),
	closedBy,
	nodeId: req(str()),
	config: obj({
		maxParticipants: int(),
		emptyTimeoutMs: long(),
		departureTimeoutMs: long(),
		metadata: str('Only with store_metadata')
	}),
	participants: req(
		obj({
			sessions: req(int()),
			unique: req(int()),
			active: req(int('Excludes dependent kinds (EGRESS, AGENT)')),
			peakActive: req(int('Excludes dependent kinds (EGRESS, AGENT)')),
			peakPublishers: int(
				'Most STANDARD sessions active at once that have sent media; absent on rooms of an earlier writer'
			),
			aborted: req(int()),
			byKind: req(counts(ParticipantKind))
		})
	),
	topology: oneOfValues(RoomTopology, 'From peakActive and peakPublishers; absent on rooms of an earlier writer'),
	tracks: req(obj({ published: req(int()), bySource: req(counts(TrackSource)) })),
	egress: req(obj({ total: req(int()), active: req(int()), byType: req(counts(EgressType)) })),
	ingress: req(obj({ sessions: req(int()), active: req(int()) })),
	bytes: req(bytes),
	quality: req(quality),
	features: req(
		obj({
			egress: req(bool()),
			ingress: req(bool()),
			agent: req(bool()),
			sip: req(bool()),
			recording: bool(
				'An egress with a file or segments output reached active; absent on rooms of an earlier writer'
			)
		})
	),
	lastEventAt: req(date()),
	lastStatsAt: date(),
	mediaStats: mediaStatsMark,
	mediaNode: mediaNodeMark,
	internal,
	...entityBase
});

const participants = obj({
	_id: req(str('Participant SID')),
	identity: req(str()),
	identityLower: req(str()),
	name: str(),
	roomSid: req(str()),
	roomName: req(str()),
	kind: req(oneOfValues(ParticipantKind)),
	kindDetails: arr(oneOfValues(ParticipantKindDetail)),
	status: req(oneOfValues(ParticipantStatus)),
	joinedAt: req(date()),
	activeAt: date(),
	leftAt: date(),
	durationMs: long(),
	disconnectReason: oneOfValues(DisconnectReason),
	closedBy,
	connectTimeMs: int(),
	connectionType: oneOfValues(Object.values(ConnectionType).filter((type) => type !== ConnectionType.OTHER)),
	region: str(),
	nodeId: req(str()),
	resumes: req(int()),
	client: obj({
		sdk: oneOfValues(ClientSdk),
		version: str(),
		os: str(),
		osVersion: str(),
		browser: str(),
		browserVersion: str(),
		deviceModel: str(),
		network: str(),
		address: str('Absent with anonymize_ip')
	}),
	permission: obj({
		canSubscribe: bool(),
		canPublish: bool(),
		canPublishData: bool(),
		canPublishSources: arr(oneOfValues(TrackSource)),
		hidden: bool(),
		canUpdateMetadata: bool(),
		canSubscribeMetrics: bool()
	}),
	isPublisher: req(bool()),
	metadata: str('Only with store_metadata'),
	attributes: obj({}, { additionalProperties: str(), description: 'Only with store_metadata' }),
	tracks: req(
		obj({
			published: req(int()),
			bySource: req(counts(TrackSource)),
			subscribed: req(int()),
			subscribeFailures: req(int())
		})
	),
	bytes: req(bytes),
	quality: req(
		obj({
			scoreSum: req(double()),
			scoreCount: req(int()),
			minScore: double(),
			poor: req(int()),
			lost: req(int()),
			lastScore: double(),
			lastScoreAt: date()
		})
	),
	lastEventAt: req(date()),
	lastStatsAt: date(),
	mediaStats: mediaStatsMark,
	mediaNode: mediaNodeMark,
	internal,
	...entityBase
});

const tracks = obj({
	_id: req(str('Track SID')),
	roomSid: req(str()),
	participantSid: req(str()),
	identity: str(),
	type: req(oneOfValues(TrackType)),
	source: req(oneOfValues(TrackSource)),
	mimeType: str(),
	name: str(),
	status: req(oneOfValues(TrackStatus)),
	publishedAt: req(date()),
	unpublishedAt: date(),
	durationMs: long(),
	closedBy,
	muted: req(bool()),
	width: int(),
	height: int(),
	simulcast: bool(),
	codecs: arr(
		obj({
			mimeType: req(str()),
			layers: arr(obj({ quality: req(oneOfValues(VideoQuality)), width: int(), height: int(), bitrate: int() }))
		})
	),
	encryption: oneOfValues(EncryptionType),
	subscribers: req(obj({ current: req(int()), total: req(int()), failed: req(int()) })),
	publishStats: obj({ ...finalStatsFields, layers: req(arr(layerStats)) }),
	internal,
	...entityBase
});

const trackSubscriptions = obj({
	_id: req(str('<trackSid>:<subscriberSid>')),
	trackSid: req(str()),
	roomSid: req(str()),
	subscriberSid: req(str()),
	subscriberIdentity: str(),
	publisherSid: str(),
	publisherIdentity: str(),
	source: oneOfValues(TrackSource),
	status: req(oneOfValues(SubscriptionStatus)),
	error: str(),
	subscribedAt: date(),
	unsubscribedAt: date(),
	durationMs: long(),
	closedBy,
	subscribeStats: obj(finalStatsFields),
	...entityBase
});

const egresses = obj({
	_id: req(str('Egress id')),
	roomSid: str('Absent for web egress'),
	roomName: str(),
	roomNameLower: str('Lower-cased roomName, for the room name prefix search'),
	type: req(oneOfValues(EgressType)),
	sourceType: req(oneOfValues(EgressSourceType)),
	status: req(oneOfValues(EgressStatus)),
	closedBy,
	startedAt: req(date()),
	updatedAt: req(date()),
	endedAt: date(),
	durationMs: long(),
	error: str(),
	errorCode: int(),
	request: req(
		obj(
			{
				layout: str(),
				customBaseUrl: str(),
				url: str('Redacted'),
				audioOnly: bool(),
				videoOnly: bool(),
				participantIdentity: str(),
				screenShare: bool(),
				trackId: str(),
				audioTrackId: str(),
				videoTrackId: str(),
				preset: str(),
				advanced: anyObject('Encoding options without credentials'),
				outputs: arr(oneOfValues(EgressOutputKind))
			},
			{ description: 'Sanitized request: no credentials, no stream keys' }
		)
	),
	rawRequest: anyObject(
		'Request in raw event payload encoding: the set member of the request oneof, allow-listed fields'
	),
	outputs: req(
		arr(
			obj({
				kind: req(oneOfValues(EgressOutputKind)),
				filename: str(),
				url: str('Redacted stream URL'),
				playlistName: str(),
				filenamePrefix: str(),
				location: str(),
				size: long(),
				durationMs: long(),
				status: oneOfValues(EgressStreamStatus),
				error: str(),
				startedAt: date(),
				endedAt: date()
			})
		)
	),
	statusHistory: req(arr(obj({ status: req(oneOfValues(EgressStatus)), at: req(date()) }), { maxItems: 50 })),
	retryCount: req(int()),
	backupStorageUsed: req(bool()),
	...entityBase
});

const ingresses = obj({
	_id: req(str('Ingress id')),
	name: str(),
	nameLower: str(),
	inputType: req(oneOfValues(IngressInputType)),
	url: str('Without stream key or credentials'),
	roomName: req(str()),
	participantIdentity: req(str()),
	participantName: str(),
	participantMetadata: str('Only with store_metadata'),
	reusable: req(bool()),
	enabled: req(bool()),
	enableTranscoding: bool(),
	createdAt: req(date()),
	deletedAt: date(),
	status: req(oneOfValues(IngressStatus)),
	lastError: str(),
	sessions: req(int()),
	totalDurationMs: req(long()),
	lastSessionAt: date(),
	internal,
	...entityBase
});

const ingressSessions = obj({
	_id: req(str('ingress.state.resource_id')),
	ingressId: req(str()),
	ingressName: str(),
	inputType: req(oneOfValues(IngressInputType)),
	roomSid: str(),
	roomName: str(),
	participantIdentity: str(),
	status: req(oneOfValues(IngressSessionStatus)),
	error: str(),
	closedBy,
	startedAt: req(date()),
	endedAt: date(),
	durationMs: long(),
	video: obj({ mimeType: str(), averageBitrate: int(), width: int(), height: int(), framerate: double() }),
	audio: obj({ mimeType: str(), averageBitrate: int(), channels: int(), sampleRate: int() }),
	...entityBase
});

const events = obj({
	_id: req(str('LiveKit event id (AE_…); AE_SYN_… for synthetic events')),
	type: req(oneOfValues(StoredEventType)),
	ts: req(date()),
	roomSid: str(),
	roomName: str(),
	participantSid: str(),
	identity: str(),
	trackSid: str(),
	egressId: str(),
	ingressId: str(),
	ingressSessionId: str(),
	nodeId: req(str()),
	synthetic: req(bool()),
	payload: req(anyObject('Protocol event in protojson naming without lifted keys or secrets'))
});

const trackStats = obj({
	_id: { bsonType: 'objectId' },
	ts: req(date()),
	meta: req(
		obj({
			roomSid: req(str()),
			participantSid: req(str()),
			trackSid: str('Track stats detail only'),
			kind: req(oneOfValues(StatsDirection)),
			nodeId: req(str())
		})
	),
	score: req(double()),
	minScore: req(double()),
	medianScore: req(double()),
	bytes: req(long()),
	packets: req(int()),
	packetsLost: req(int()),
	rttMs: req(int()),
	jitterMs: req(double()),
	nacks: req(int()),
	plis: req(int()),
	firs: req(int()),
	frames: req(int()),
	layers: req(arr(layerStats)),
	mimeType: str('Track stats detail only')
});

const rollupBase = {
	_id: req({ bsonType: 'string', pattern: ROLLUP_ID_PATTERN }),
	scope: req({ bsonType: 'string', pattern: SCOPE_PATTERN }),
	bucket: req(date('Start of the UTC bucket')),
	mediaStats: obj(
		{
			reported: bool('Written by a server that reports media statistics'),
			missing: bool('Written by a server that does not report media statistics')
		},
		{ description: 'Media statistics of the servers that wrote the bucket; absent on older buckets (reported)' }
	)
};

const rollupBytes = obj({ up: long(), down: long() });

const rollupQuality = obj({ scoreSum: double(), scoreCount: int(), poor: int(), lost: int() });

const apiCalls = obj({ total: int(), byMethod: patternCounts(API_METHOD_PATTERN) });

/** Egress and ingress run on a media node the events do not name, so their rollups exist in the global scope only. */
const GLOBAL_ONLY = 'Global scope only';
const EGRESS_PEAK = 'Most egresses in progress at once in the bucket, sampled every minute by the server aggregator';

const hourlyFields = {
	...rollupBase,
	rooms: obj({
		created: int(),
		ended: int(),
		endedByReason: counts(RoomEndReason),
		durationMsSum: long(),
		participantsSum: int(),
		peakActive: int('Most rooms active at once in the bucket, sampled every minute by the server aggregator'),
		byTopology: counts(RoomTopology, 'Rooms ended in the bucket by topology'),
		recorded: int('Rooms counted in byTopology that were recorded'),
		sizeByTopology: obj(
			Object.fromEntries(SIZED_ROOM_TOPOLOGIES.map((topology) => [topology, counts(RoomSizeRange)])),
			{
				description:
					'Rooms ended in the bucket by the size range of their most STANDARD sessions active at once'
			}
		)
	}),
	participants: obj({
		joined: int(),
		active: int('PARTICIPANT_ACTIVE events'),
		aborted: int(),
		left: int(),
		byKind: counts(ParticipantKind),
		bySdk: counts(ClientSdk),
		byOs: counts(OsFamily),
		byBrowser: counts(BrowserFamily),
		byConnectionType: counts(ConnectionType),
		disconnectReasons: counts(DisconnectReason),
		connectTimeSumMs: long(),
		connectTimeCount: int(),
		minutes: double(),
		peakActive: int(
			'Most STANDARD sessions active at once in the bucket, sampled every minute by the server aggregator'
		)
	}),
	tracks: obj({ published: int(), subscribed: int(), subscribeFailed: int() }),
	egress: obj(
		{
			started: int(),
			byType: counts(EgressType),
			endedByStatus: counts(EgressStatus),
			durationMs: long(),
			peakActive: int(EGRESS_PEAK)
		},
		{ description: GLOBAL_ONLY }
	),
	ingress: obj(
		{
			sessionsStarted: int(),
			sessionsEnded: int(),
			byInputType: counts(IngressInputType, 'Sessions started by input type'),
			durationMs: long(),
			peakActive: int(
				'Most ingress sessions publishing at once in the bucket, sampled every minute by the server aggregator'
			)
		},
		{ description: GLOBAL_ONLY }
	),
	bytes: rollupBytes,
	quality: rollupQuality,
	apiCalls,
	apiErrors: apiCalls
};

const analyticsHourly = obj(hourlyFields);

const analyticsDaily = obj({
	...hourlyFields,
	uniqueIdentities: int('Set by the server aggregator once the UTC day has closed')
});

const analytics5min = obj({
	...rollupBase,
	rooms: obj({
		created: int(),
		ended: int(),
		peakActive: int('Most rooms active at once in the bucket, sampled every minute by the server aggregator')
	}),
	participants: obj({
		connected: int('Distinct participants with stats in the bucket'),
		joined: int(),
		active: int('PARTICIPANT_ACTIVE events'),
		left: int(),
		aborted: int(),
		peakActive: int(
			'Most STANDARD sessions active at once in the bucket, sampled every minute by the server aggregator'
		)
	}),
	egress: obj({ started: int(), ended: int(), peakActive: int(EGRESS_PEAK) }, { description: GLOBAL_ONLY }),
	bytes: rollupBytes,
	quality: rollupQuality,
	internal
});

const nodes = obj({
	_id: req(str('Node id')),
	firstSeenAt: req(date()),
	lastSeenAt: req(date()),
	serverVersion: req(str()),
	region: str('No longer written; documents written before keep it'),
	batchIntervalMs: { ...int('Configured batch interval of the node, in milliseconds'), minimum: 1000 },
	mediaStats: bool(
		'Whether the node reports media statistics; absent on documents written before it existed (read as true)'
	),
	rtcEngine: oneOfValues(RtcEngine, 'RTC engine of the server; absent on older documents (pion)'),
	mediaNode: { ...str('Media node label of the server; absent when it has none'), pattern: MEDIA_NODE_PATTERN },
	ip: str('IP of the machine named by mediaNode; only with a label'),
	drainingAt: date('First heartbeat while the server drained'),
	stoppedAt: date('Set by a graceful stop, after the final batch'),
	rooms: obj({
		hosted: int('Rooms whose ROOM_CREATED the server wrote as their host'),
		reconciled: int('Rooms of the server closed by the reconciler')
	})
});

const metaId = (id: string): BsonSchema => ({ bsonType: 'string', enum: [id] });

const reconcilerCounts = {
	room: req(int()),
	participant: req(int()),
	egress: req(int()),
	ingressSession: req(int())
};

const schemaMeta: BsonSchema = {
	bsonType: 'object',
	required: ['_id'],
	oneOf: [
		obj({ _id: req(metaId('schema')), version: req(int()), writerVersion: req(str()), updatedAt: req(date()) }),
		obj({
			_id: req(metaId('retention')),
			eventsMs: req(long()),
			statsMs: req(long()),
			tracksMs: req(long()),
			entitiesMs: req(long()),
			rollups5MinMs: req(long()),
			rollupsHourlyMs: req(long()),
			rollupsDailyMs: req(nullable(long('null keeps documents forever'))),
			updatedAt: req(date())
		}),
		obj({
			_id: req(metaId('capabilities')),
			timeseries: req(bool()),
			transactions: req(bool()),
			serverVersion: req(str()),
			detectedAt: req(date())
		}),
		obj({ _id: req(metaId('config')), statsDetail: req(oneOfValues(StatsDetail)), recordedAt: req(date()) }),
		obj({
			_id: req(metaId('migration')),
			state: req(oneOfValues(MigrationState)),
			checkpoint: anyObject(),
			processed: req(long()),
			total: req(long()),
			startedAt: date(),
			finishedAt: date(),
			error: str(),
			writerVersion: req(str()),
			fromSchemaVersion: req(int()),
			counts: req(obj({ events: req(long()), stats: req(long()), synthetic: req(long()), skipped: req(long()) })),
			nodeId: str(),
			legacyRetainedUntil: date()
		}),
		obj({
			_id: req(metaId('reconciler')),
			lastRunAt: req(date()),
			lastRunDurationMs: req(long()),
			nodeId: req(str()),
			candidates: req(obj(reconcilerCounts)),
			closed: req(obj({ ...reconcilerCounts, track: req(int()), subscription: req(int()) })),
			partial: req(bool()),
			lastError: str()
		}),
		obj({ _id: req(metaId('dashboard')) }, { additionalProperties: true })
	]
};

/** `$jsonSchema` validator of every collection. */
export const COLLECTION_SCHEMAS: Readonly<Record<Collection, BsonSchema>> = {
	[Collection.ROOMS]: rooms,
	[Collection.PARTICIPANTS]: participants,
	[Collection.TRACKS]: tracks,
	[Collection.TRACK_SUBSCRIPTIONS]: trackSubscriptions,
	[Collection.EGRESSES]: egresses,
	[Collection.INGRESSES]: ingresses,
	[Collection.INGRESS_SESSIONS]: ingressSessions,
	[Collection.EVENTS]: events,
	[Collection.TRACK_STATS]: trackStats,
	[Collection.ANALYTICS_5MIN]: analytics5min,
	[Collection.ANALYTICS_HOURLY]: analyticsHourly,
	[Collection.ANALYTICS_DAILY]: analyticsDaily,
	[Collection.NODES]: nodes,
	[Collection.SCHEMA_META]: schemaMeta
};
