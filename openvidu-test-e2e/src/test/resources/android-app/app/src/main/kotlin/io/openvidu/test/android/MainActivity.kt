package io.openvidu.test.android

import android.Manifest
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.View
import android.view.inputmethod.InputMethodManager
import android.widget.Button
import android.widget.CompoundButton
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import io.livekit.android.LiveKit
import io.livekit.android.LiveKitOverrides
import io.livekit.android.RoomOptions
import io.livekit.android.audio.MixerAudioBufferCallback
import io.livekit.android.events.RoomEvent
import io.livekit.android.events.TrackEvent
import io.livekit.android.events.collect
import io.livekit.android.renderer.TextureViewRenderer
import io.livekit.android.room.Room
import io.livekit.android.room.participant.Participant
import io.livekit.android.room.participant.RemoteParticipant
import io.livekit.android.room.track.AudioTrack
import io.livekit.android.room.track.DataPublishReliability
import io.livekit.android.room.track.LocalAudioTrack
import io.livekit.android.room.track.LocalVideoTrack
import io.livekit.android.room.track.RemoteAudioTrack
import io.livekit.android.room.track.Track
import io.livekit.android.room.track.TrackPublication
import io.livekit.android.room.track.VideoTrack
import io.livekit.android.util.LoggingLevel
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import livekit.org.webrtc.AudioTrackSink
import livekit.org.webrtc.RTCStats
import livekit.org.webrtc.RTCStatsReport
import livekit.org.webrtc.SoftwareVideoDecoderFactory
import livekit.org.webrtc.VideoFrame
import livekit.org.webrtc.VideoSink
import org.json.JSONArray
import org.json.JSONObject
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicLong
import kotlin.math.PI
import kotlin.math.sin
import kotlin.math.sqrt

/**
 * Joins a LiveKit Room with the URL and token typed in, publishes camera and
 * microphone, and shows every remote video. The e2e test drives it through Appium
 * and reads, as JSON in the "status" view, its state, the events it received (Room
 * events, the participant events of each participant and the track events of each
 * remote video, counted by name), the connection quality, speaking state, name,
 * metadata and attributes of each participant, the data messages it received, what
 * its camera and microphone capture and its encoder sends (per simulcast layer),
 * and what it decodes from each remote track.
 */
class MainActivity : ComponentActivity() {

    private lateinit var room: Room
    private lateinit var urlInput: EditText
    private lateinit var tokenInput: EditText
    private lateinit var codecInput: EditText
    private lateinit var simulcastSwitch: CompoundButton
    private lateinit var testToneSwitch: CompoundButton
    private lateinit var largeVideosSwitch: CompoundButton
    private lateinit var stateView: TextView
    private lateinit var statusView: TextView
    private lateinit var remoteVideos: LinearLayout
    private lateinit var localRenderer: TextureViewRenderer
    private val testTone = TestTone()

    // Number of RoomEvents received, by event name
    private val eventCounts = ConcurrentHashMap<String, AtomicInteger>()

    // Number of ParticipantEvents of the local participant and of each remote participant
    // (by identity), and of TrackEvents of each remote video (by track sid), by event name
    private val localEventCounts = ConcurrentHashMap<String, AtomicInteger>()
    private val remoteEventCounts = ConcurrentHashMap<String, ConcurrentHashMap<String, AtomicInteger>>()
    private val trackEventCounts = ConcurrentHashMap<String, ConcurrentHashMap<String, AtomicInteger>>()
    private val trackEventJobs = HashMap<String, Job>()
    private val participantsCollected = HashSet<RemoteParticipant>()

    // What the last TrackEvents of each remote video said: visible, and the size of its views
    private val videoVisible = ConcurrentHashMap<String, Boolean>()
    private val videoViewSize = ConcurrentHashMap<String, String>()

    // What was captured by each local track and decoded from each subscribed remote
    // track, by track sid
    private val videoReceivers = ConcurrentHashMap<String, VideoReceiver>()
    private val audioReceivers = ConcurrentHashMap<String, AudioReceiver>()
    private val remoteRenderers = HashMap<String, TextureViewRenderer>()

    // Last stream state of each remote track, by track sid
    private val streamStates = ConcurrentHashMap<String, String>()

    // The last data messages received
    private val dataReceived = ArrayDeque<JSONObject>()

    // From the WebRTC stats: the outbound video layers, and each inbound video by track id
    @Volatile
    private var publisherVideoLayers = JSONArray()

    @Volatile
    private var subscriberVideos = emptyMap<String, JSONObject>()

    @Volatile
    private var lastError: String? = null

    private val permissionsRequest =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) {}

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        urlInput = findViewById(R.id.url)
        tokenInput = findViewById(R.id.token)
        codecInput = findViewById(R.id.codec)
        simulcastSwitch = findViewById(R.id.simulcast)
        testToneSwitch = findViewById(R.id.test_tone)
        largeVideosSwitch = findViewById(R.id.large_videos)
        stateView = findViewById(R.id.state)
        statusView = findViewById(R.id.status)
        remoteVideos = findViewById(R.id.remote_videos)
        localRenderer = findViewById(R.id.local_video)

        LiveKit.loggingLevel = LoggingLevel.INFO
        // Loads the WebRTC library, which SoftwareVideoDecoderFactory needs before create()
        LiveKit.init(applicationContext)
        // As LiveKit recommends for apps: receive each video at the size of its view,
        // and publish only the camera layers someone receives. On an emulator, decode
        // video in software: its "hardware" decoders (c2.goldfish.*) hand every frame to
        // the host and fall behind ("Too many frames backed up in the decoder"), and the
        // camera, whose frames come from the host as well, then gives 1 frame per second
        val emulator = Build.HARDWARE == "ranchu" || Build.HARDWARE == "goldfish"
        val overrides = if (emulator) {
            LiveKitOverrides(videoDecoderFactory = SoftwareVideoDecoderFactory())
        } else {
            LiveKitOverrides()
        }
        room = LiveKit.create(applicationContext, RoomOptions(adaptiveStream = true, dynacast = true), overrides)
        room.initVideoRenderer(localRenderer)

        findViewById<Button>(R.id.connect).setOnClickListener { connect() }
        findViewById<Button>(R.id.disconnect).setOnClickListener { room.disconnect() }
        testToneSwitch.setOnCheckedChangeListener { _, _ -> applyTestTone() }
        findViewById<CompoundButton>(R.id.camera).setOnCheckedChangeListener { _, enabled ->
            setTrackEnabled("camera", enabled) { room.localParticipant.setCameraEnabled(it) }
        }
        findViewById<CompoundButton>(R.id.microphone).setOnCheckedChangeListener { _, enabled ->
            setTrackEnabled("microphone", enabled) { room.localParticipant.setMicrophoneEnabled(it) }
        }
        findViewById<Button>(R.id.send_data).setOnClickListener {
            lifecycleScope.launch {
                room.localParticipant.publishData(
                    "Hello from Android".toByteArray(),
                    DataPublishReliability.RELIABLE,
                    "openvidu-e2e",
                )
            }
        }
        largeVideosSwitch.setOnCheckedChangeListener { _, _ ->
            remoteRenderers.values.forEach { it.layoutParams = remoteVideoLayoutParams() }
        }
        findViewById<CompoundButton>(R.id.show_videos).setOnCheckedChangeListener { _, show ->
            remoteVideos.visibility = if (show) View.VISIBLE else View.GONE
        }

        lifecycleScope.launch {
            room.events.collect { onRoomEvent(it) }
        }
        lifecycleScope.launch {
            room.localParticipant.events.collect { count(localEventCounts, it) }
        }
        lifecycleScope.launch {
            while (isActive) {
                showStatus()
                delay(500)
            }
        }
        lifecycleScope.launch {
            while (isActive) {
                if (room.state == Room.State.CONNECTED) {
                    collectStats()
                }
                delay(1000)
            }
        }

        // The e2e test installs the app with every permission granted
        val missing = arrayOf(Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO)
            .filter { ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED }
        if (missing.isNotEmpty()) {
            permissionsRequest.launch(missing.toTypedArray())
        }
    }

    private fun connect() {
        getSystemService(InputMethodManager::class.java)
            ?.hideSoftInputFromWindow(window.decorView.windowToken, 0)
        val url = urlInput.text.toString().trim()
        val token = tokenInput.text.toString().trim()
        val codec = codecInput.text.toString().trim().lowercase()
        // VP9 and AV1 are published with SVC (L3T3_KEY) instead of simulcast
        room.videoTrackPublishDefaults = room.videoTrackPublishDefaults.copy(
            videoCodec = codec.ifEmpty { room.videoTrackPublishDefaults.videoCodec },
            simulcast = simulcastSwitch.isChecked,
        )
        lastError = null
        lifecycleScope.launch {
            try {
                room.connect(url, token)
                val participant = room.localParticipant
                if (!participant.setCameraEnabled(true)) {
                    lastError = "Could not publish the camera"
                }
                if (!participant.setMicrophoneEnabled(true)) {
                    lastError = "Could not publish the microphone"
                }
                (participant.getTrackPublication(Track.Source.CAMERA)?.track as? LocalVideoTrack)?.let {
                    it.addRenderer(localRenderer)
                    addVideoReceiver(it)
                }
                (participant.getTrackPublication(Track.Source.MICROPHONE)?.track as? LocalAudioTrack)
                    ?.let { addAudioReceiver(it) }
                applyTestTone()
            } catch (e: Exception) {
                Log.e(TAG, "Could not connect to $url", e)
                lastError = e.toString()
            }
        }
    }

    private fun applyTestTone() {
        val microphone = room.localParticipant.getTrackPublication(Track.Source.MICROPHONE)?.track
        (microphone as? LocalAudioTrack)?.setAudioBufferCallback(if (testToneSwitch.isChecked) testTone else null)
    }

    // A publication that fails (no permission to publish, for example) throws
    private fun setTrackEnabled(name: String, enabled: Boolean, set: suspend (Boolean) -> Boolean) {
        lifecycleScope.launch {
            try {
                if (!set(enabled)) {
                    lastError = "Could not turn the $name ${if (enabled) "on" else "off"}"
                }
            } catch (e: Exception) {
                Log.w(TAG, "Could not turn the $name ${if (enabled) "on" else "off"}", e)
                lastError = e.toString()
            }
        }
    }

    private fun count(counts: ConcurrentHashMap<String, AtomicInteger>, event: Any) {
        counts.computeIfAbsent(event.javaClass.simpleName) { AtomicInteger() }.incrementAndGet()
    }

    // Counts the ParticipantEvents of a remote participant from now on (undispatched: before
    // the caller lets anything else run)
    private fun collectEvents(participant: RemoteParticipant) {
        val identity = participant.identity?.value ?: return
        if (participantsCollected.add(participant)) {
            val counts = remoteEventCounts.computeIfAbsent(identity) { ConcurrentHashMap() }
            lifecycleScope.launch(start = CoroutineStart.UNDISPATCHED) {
                participant.events.collect { count(counts, it) }
            }
        }
    }

    private fun onRoomEvent(event: RoomEvent) {
        count(eventCounts, event)
        when (event) {
            is RoomEvent.Connected -> room.remoteParticipants.values.forEach { collectEvents(it) }
            is RoomEvent.ParticipantConnected -> collectEvents(event.participant)
            is RoomEvent.TrackSubscribed -> onTrackSubscribed(event.track)
            is RoomEvent.TrackUnsubscribed -> onTrackUnsubscribed(event.track)
            is RoomEvent.TrackStreamStateChanged ->
                streamStates[event.trackPublication.sid] = event.streamState.name
            is RoomEvent.DataReceived -> synchronized(dataReceived) {
                dataReceived.addLast(
                    JSONObject()
                        .put("from", event.participant?.identity?.value ?: JSONObject.NULL)
                        .put("topic", event.topic ?: JSONObject.NULL)
                        .put("text", String(event.data)),
                )
                if (dataReceived.size > 10) {
                    dataReceived.removeFirst()
                }
            }
            is RoomEvent.FailedToConnect -> lastError = event.error.toString()
            is RoomEvent.Disconnected -> {
                event.error?.let { lastError = it.toString() }
                remoteRenderers.keys.toList().forEach { removeRenderer(it) }
                trackEventJobs.values.forEach { it.cancel() }
                trackEventJobs.clear()
            }
            else -> {}
        }
    }

    private fun addVideoReceiver(track: VideoTrack) {
        val receiver = VideoReceiver()
        videoReceivers[track.sid ?: return] = receiver
        track.addRenderer(receiver)
    }

    private fun addAudioReceiver(track: AudioTrack) {
        val receiver = AudioReceiver()
        audioReceivers[track.sid ?: return] = receiver
        track.addSink(receiver)
    }

    private fun remoteVideoLayoutParams(): LinearLayout.LayoutParams {
        // 16:9. 90dp high gets the 360p layer of a 1080p simulcast, 180dp the 1080p one
        val params = if (largeVideosSwitch.isChecked) {
            LinearLayout.LayoutParams(dp(320), dp(180))
        } else {
            LinearLayout.LayoutParams(dp(160), dp(90))
        }
        params.marginEnd = dp(4)
        return params
    }

    private fun onTrackSubscribed(track: Track) {
        val sid = track.sid ?: return
        if (track is VideoTrack) {
            addVideoReceiver(track)
            // Before the renderer, whose view makes adaptive stream post the first ones
            val counts = trackEventCounts.computeIfAbsent(sid) { ConcurrentHashMap() }
            trackEventJobs.remove(sid)?.cancel()
            trackEventJobs[sid] = lifecycleScope.launch(start = CoroutineStart.UNDISPATCHED) {
                track.events.collect {
                    count(counts, it)
                    when (it) {
                        is TrackEvent.VisibilityChanged -> videoVisible[sid] = it.isVisible
                        is TrackEvent.VideoDimensionsChanged ->
                            videoViewSize[sid] = "${it.newDimensions.width}x${it.newDimensions.height}"
                        else -> {}
                    }
                }
            }
            val renderer = TextureViewRenderer(this)
            room.initVideoRenderer(renderer)
            renderer.contentDescription = "remote-video-$sid"
            remoteVideos.addView(renderer, remoteVideoLayoutParams())
            remoteRenderers[sid] = renderer
            track.addRenderer(renderer)
        } else if (track is RemoteAudioTrack) {
            addAudioReceiver(track)
        }
    }

    private fun onTrackUnsubscribed(track: Track) {
        val sid = track.sid ?: return
        if (track is VideoTrack) {
            trackEventJobs.remove(sid)?.cancel()
            videoReceivers.remove(sid)?.let { track.removeRenderer(it) }
            remoteRenderers[sid]?.let { track.removeRenderer(it) }
            removeRenderer(sid)
        } else if (track is RemoteAudioTrack) {
            audioReceivers.remove(sid)?.let { track.removeSink(it) }
        }
    }

    private fun removeRenderer(sid: String) {
        remoteRenderers.remove(sid)?.let {
            remoteVideos.removeView(it)
            it.release()
        }
    }

    private fun collectStats() {
        try {
            room.getPublisherRTCStats { report -> publisherVideoLayers = outboundVideoLayers(report) }
            room.getSubscriberRTCStats { report -> subscriberVideos = inboundVideos(report) }
        } catch (e: Exception) {
            Log.w(TAG, "Could not get the WebRTC stats", e)
        }
    }

    private fun codecs(report: RTCStatsReport) =
        report.statsMap.values.filter { it.type == "codec" }.associate { it.id to it.members["mimeType"] }

    private fun RTCStats.member(name: String): Any = members[name] ?: JSONObject.NULL

    // One per simulcast layer (rid "q", "h" and "f"), or a single one with SVC
    private fun outboundVideoLayers(report: RTCStatsReport): JSONArray {
        val codecs = codecs(report)
        val layers = JSONArray()
        report.statsMap.values
            .filter { it.type == "outbound-rtp" && it.members["kind"] == "video" }
            .sortedBy { it.members["rid"]?.toString() ?: "" }
            .forEach {
                layers.put(
                    JSONObject()
                        .put("rid", it.member("rid"))
                        .put("active", it.member("active"))
                        .put("codec", codecs[it.members["codecId"]] ?: JSONObject.NULL)
                        .put("scalabilityMode", it.member("scalabilityMode"))
                        .put("encoder", it.member("encoderImplementation"))
                        .put("width", it.member("frameWidth"))
                        .put("height", it.member("frameHeight"))
                        .put("framesEncoded", it.member("framesEncoded"))
                        .put("fps", it.member("framesPerSecond"))
                        .put("limitation", it.member("qualityLimitationReason")),
                )
            }
        return layers
    }

    // By the id of the WebRTC track
    private fun inboundVideos(report: RTCStatsReport): Map<String, JSONObject> {
        val codecs = codecs(report)
        return report.statsMap.values
            .filter { it.type == "inbound-rtp" && it.members["kind"] == "video" }
            .associate {
                it.members["trackIdentifier"].toString() to JSONObject()
                    .put("codec", codecs[it.members["codecId"]] ?: JSONObject.NULL)
                    .put("decoder", it.member("decoderImplementation"))
                    .put("ssrc", it.member("ssrc"))
                    .put("packetsReceived", it.member("packetsReceived"))
                    .put("framesReceived", it.member("framesReceived"))
                    .put("framesDecoded", it.member("framesDecoded"))
                    .put("frameWidth", it.member("frameWidth"))
                    .put("frameHeight", it.member("frameHeight"))
                    .put("keyFramesDecoded", it.member("keyFramesDecoded"))
                    .put("pliCount", it.member("pliCount"))
                    .put("nackCount", it.member("nackCount"))
            }
    }

    /**
     * {"state":"CONNECTED","identity":"...","error":null,"connectionQuality":"EXCELLENT","speaking":true,
     *  "activeSpeakers":["..."],"events":{"Connected":1,...},"data":[{"from":"...","topic":"...","text":"..."}],
     *  "roomMetadata":"...","localParticipant":{"name":"...","metadata":"...","attributes":{...},
     *    "state":"ACTIVE","canPublish":true,"events":{"LocalTrackPublished":2,...}},
     *  "remoteEvents":{"<identity>":{"TrackSubscribed":2,...},...},
     *  "local":[{"sid":"TR_...","kind":"video","source":"CAMERA","muted":false,"frames":300,"width":720,
     *            "height":1280,"layers":[{"rid":"f","active":true,"codec":"video/VP8",...},...]},
     *           {"sid":"TR_...","kind":"audio","source":"MICROPHONE","muted":false,"samples":96000,"level":5792}],
     *  "remote":[{"identity":"...","connectionQuality":"EXCELLENT","speaking":false,"name":"...","metadata":"...",
     *    "attributes":{...},"state":"ACTIVE","tracks":[
     *     {"sid":"TR_...","kind":"video",...,"subscribed":true,"streamState":"ACTIVE","frames":120,"width":640,
     *      "height":360,"codec":"video/VP8","decoder":"libvpx","inbound":{"ssrc":...,"packetsReceived":...,...},
     *      "events":{"VisibilityChanged":1,...},"visible":true,"viewSize":"420x236"},
     *     {"sid":"TR_...","kind":"audio",...,"subscribed":true,"samples":96000,"level":3000}]}]}
     */
    private fun showStatus() {
        val events = countsJson(eventCounts)
        val data = synchronized(dataReceived) { JSONArray(dataReceived.toList()) }

        val local = JSONArray()
        room.localParticipant.trackPublications.values.forEach { publication ->
            val json = publicationJson(publication)
            if (publication.kind == Track.Kind.VIDEO) {
                json.put("layers", publisherVideoLayers)
            }
            local.put(json)
        }

        val remote = JSONArray()
        room.remoteParticipants.values.forEach { participant ->
            val tracks = JSONArray()
            participant.trackPublications.values.forEach { publication ->
                val json = publicationJson(publication)
                    .put("subscribed", publication.subscribed)
                    .put("streamState", streamStates[publication.sid] ?: JSONObject.NULL)
                publication.track?.rtcTrack?.id()?.let { id ->
                    subscriberVideos[id]?.let {
                        json.put("codec", it.get("codec")).put("decoder", it.get("decoder")).put("inbound", it)
                    }
                }
                trackEventCounts[publication.sid]?.let {
                    json.put("events", countsJson(it))
                        .put("visible", videoVisible[publication.sid] ?: JSONObject.NULL)
                        .put("viewSize", videoViewSize[publication.sid] ?: JSONObject.NULL)
                }
                tracks.put(json)
            }
            remote.put(
                participantJson(participant)
                    .put("identity", participant.identity?.value)
                    .put("connectionQuality", participant.connectionQuality.name)
                    .put("speaking", participant.isSpeaking)
                    .put("tracks", tracks),
            )
        }

        // Only when it changes: setting the text of this wrap_content view lays the window out
        if (stateView.text.toString() != room.state.name) {
            stateView.text = room.state.name
        }
        statusView.text = JSONObject()
            .put("state", room.state.name)
            .put("identity", room.localParticipant.identity?.value ?: JSONObject.NULL)
            .put("error", lastError ?: JSONObject.NULL)
            .put("connectionQuality", room.localParticipant.connectionQuality.name)
            .put("speaking", room.localParticipant.isSpeaking)
            .put("activeSpeakers", JSONArray(room.activeSpeakers.map { it.identity?.value }))
            .put("events", events)
            .put("data", data)
            .put("roomMetadata", room.metadata ?: JSONObject.NULL)
            .put(
                "localParticipant",
                participantJson(room.localParticipant)
                    .put("canPublish", room.localParticipant.permissions?.canPublish ?: JSONObject.NULL)
                    .put("events", countsJson(localEventCounts)),
            )
            // By identity, those of participants that left included
            .put("remoteEvents", JSONObject(remoteEventCounts.toSortedMap().mapValues { countsJson(it.value) }))
            .put("local", local)
            .put("remote", remote)
            .toString()
    }

    private fun countsJson(counts: Map<String, AtomicInteger>?): JSONObject {
        val json = JSONObject()
        counts?.toSortedMap()?.forEach { (name, count) -> json.put(name, count.get()) }
        return json
    }

    // What the server can change of a participant
    private fun participantJson(participant: Participant): JSONObject = JSONObject()
        .put("name", participant.name ?: JSONObject.NULL)
        .put("metadata", participant.metadata ?: JSONObject.NULL)
        .put("attributes", JSONObject(participant.attributes))
        .put("state", participant.state.name)

    // With what was captured (local) or decoded (remote) from the track, if anything yet
    private fun publicationJson(publication: TrackPublication): JSONObject {
        val json = JSONObject()
            .put("sid", publication.sid)
            .put("kind", publication.kind.value)
            .put("source", publication.source.name)
            .put("muted", publication.muted)
        videoReceivers[publication.sid]?.let {
            json.put("frames", it.frames.get()).put("width", it.width).put("height", it.height)
        }
        audioReceivers[publication.sid]?.let {
            json.put("samples", it.samples.get()).put("level", it.level)
        }
        return json
    }

    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()

    override fun onDestroy() {
        super.onDestroy()
        room.disconnect()
        room.release()
    }

    /** Counts the frames of a video track and keeps the last frame size */
    private class VideoReceiver : VideoSink {
        val frames = AtomicLong()

        @Volatile
        var width = 0

        @Volatile
        var height = 0

        override fun onFrame(frame: VideoFrame) {
            width = frame.rotatedWidth
            height = frame.rotatedHeight
            frames.incrementAndGet()
        }
    }

    /**
     * Counts the samples of an audio track, and keeps their level: the RMS of the 16-bit
     * samples of the last complete window of about 2 s. A tone or a periodic beep gives a
     * clear level, silence or comfort noise does not, and a track that goes silent stops
     * showing the level it had
     */
    private class AudioReceiver : AudioTrackSink {
        val samples = AtomicLong()

        @Volatile
        var level = 0

        private var windowSquares = 0.0
        private var windowValues = 0L
        private var windowFrames = 0

        override fun onData(
            audioData: ByteBuffer,
            bitsPerSample: Int,
            sampleRate: Int,
            numberOfChannels: Int,
            numberOfFrames: Int,
            absoluteCaptureTimestampMs: Long,
        ) {
            if (bitsPerSample == 16) {
                val pcm = audioData.duplicate().order(ByteOrder.nativeOrder()).asShortBuffer()
                while (pcm.hasRemaining()) {
                    val value = pcm.get().toDouble()
                    windowSquares += value * value
                    windowValues++
                }
            }
            windowFrames += numberOfFrames
            if (windowFrames >= 2 * sampleRate && windowValues > 0) {
                level = sqrt(windowSquares / windowValues).toInt()
                windowSquares = 0.0
                windowValues = 0
                windowFrames = 0
            }
            samples.addAndGet(numberOfFrames.toLong())
        }
    }

    /**
     * Mixes a 440 Hz tone into what the microphone records, through the SDK's mixing
     * callback, as a browser's fake microphone produces one: the microphone of an
     * emulator may record nothing but silence. In beeps (400 ms of tone, 200 ms of
     * silence), like Chrome's fake microphone: WebRTC's noise suppression learns a
     * steady tone as background noise and attenuates it, until the server no longer
     * hears the app as an active speaker
     */
    private class TestTone : MixerAudioBufferCallback() {
        private var phase = 0.0
        private var cycleFrames = 0L

        override fun onBufferRequest(
            originalBuffer: ByteBuffer,
            audioFormat: Int,
            channelCount: Int,
            sampleRate: Int,
            bytesRead: Int,
            captureTimeNs: Long,
        ): MixerAudioBufferCallback.BufferResponse? {
            if (audioFormat != AudioFormat.ENCODING_PCM_16BIT && audioFormat != AudioFormat.ENCODING_DEFAULT) {
                return null
            }
            val tone = ByteBuffer.allocateDirect(bytesRead).order(ByteOrder.nativeOrder())
            val step = 2 * PI * 440 / sampleRate
            val beepFrames = sampleRate * 4L / 10
            val cycle = sampleRate * 6L / 10
            repeat(bytesRead / 2 / channelCount) {
                // A quarter of full scale
                val value: Short = if (cycleFrames < beepFrames) (sin(phase) * 8192).toInt().toShort() else 0
                repeat(channelCount) { tone.putShort(value) }
                phase = (phase + step) % (2 * PI)
                cycleFrames = (cycleFrames + 1) % cycle
            }
            return MixerAudioBufferCallback.BufferResponse(tone)
        }
    }

    private companion object {
        const val TAG = "OpenViduE2E"
    }
}
