package io.openvidu.server.recording.service;

import com.github.dockerjava.api.model.Bind;
import com.github.dockerjava.api.model.Volume;
import io.openvidu.client.OpenViduException;
import io.openvidu.java.client.RecordingProperties;
import io.openvidu.server.cdr.CallDetailRecord;
import io.openvidu.server.config.OpenviduConfig;
import io.openvidu.server.core.EndReason;
import io.openvidu.server.core.Session;
import io.openvidu.server.recording.Recording;
import io.openvidu.server.recording.RecordingDownloader;
import io.openvidu.server.utils.QuarantineKiller;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.List;

public class ComposedQuickStartRecordingService extends ComposedRecordingService {

    private static final Logger log = LoggerFactory.getLogger(ComposedRecordingService.class);

    public ComposedQuickStartRecordingService(RecordingManager recordingManager, RecordingDownloader recordingDownloader, OpenviduConfig openviduConfig, CallDetailRecord cdr, QuarantineKiller quarantineKiller) {
        super(recordingManager, recordingDownloader, openviduConfig, cdr, quarantineKiller);
    }

    public void stopRecordingContainer(Session session, EndReason reason) {
        log.info("Stopping COMPOSED_QUICK_START of session {}. Reason: {}",
                session.getSessionId(), RecordingManager.finalReason(reason));

        String containerId = this.sessionsContainers.get(session.getSessionId());

        if (containerId != null) {
            try {
                dockerManager.removeDockerContainer(containerId, true);
            } catch (Exception e) {
                log.error("Can't remove COMPOSED_QUICK_START recording container from session {}", session.getSessionId());
            }

            containers.remove(containerId);
            sessionsContainers.remove(session.getSessionId());
        }

    }

    @Override
    protected Recording startRecordingWithVideo(Session session, Recording recording, RecordingProperties properties)
            throws OpenViduException {

        log.info("Starting COMPOSED_QUICK_START ({}) recording {} of session {}",
                properties.hasAudio() ? "video + audio" : "audio-only", recording.getId(), recording.getSessionId());

        List<String> envs = new ArrayList<>();

        envs.add("DEBUG_MODE=" + openviduConfig.isOpenViduRecordingDebug());
        envs.add("RESOLUTION=" + properties.resolution());
        envs.add("ONLY_VIDEO=" + !properties.hasAudio());
        envs.add("FRAMERATE=30");
        envs.add("VIDEO_ID=" + recording.getId());
        envs.add("VIDEO_NAME=" + properties.name());
        envs.add("VIDEO_FORMAT=mp4");
        envs.add("RECORDING_JSON='" + recording.toJson().toString() + "'");

        String containerId = this.sessionsContainers.get(session.getSessionId());
        try {
            String recordExecCommand = "";
            for(int i = 0; i < envs.size(); i++) {
                if (i > 0) {
                    recordExecCommand += "&& ";
                }
                recordExecCommand += "export " + envs.get(i) + " ";
            }
            recordExecCommand += "&& ./composed_quick_start.sh --start-recording > /var/log/ffmpeg.log 2>&1 &";
            dockerManager.runCommandInContainer(containerId, recordExecCommand, 0);
        } catch (Exception e) {
            this.cleanRecordingMaps(recording);
            throw this.failStartRecording(session, recording,
                    "Couldn't initialize recording container. Error: " + e.getMessage());
        }

        this.sessionsContainers.put(session.getSessionId(), containerId);

        try {
            this.waitForVideoFileNotEmpty(recording);
        } catch (OpenViduException e) {
            this.cleanRecordingMaps(recording);
            throw this.failStartRecording(session, recording,
                    "Couldn't initialize recording container. Error: " + e.getMessage());
        }

        return recording;
    }

    @Override
    protected Recording stopRecordingWithVideo(Session session, Recording recording, EndReason reason) {
        log.info("Stopping COMPOSED_QUICK_START ({}) recording {} of session {}. Reason: {}",
                recording.hasAudio() ? "video + audio" : "audio-only", recording.getId(), recording.getSessionId(),
                RecordingManager.finalReason(reason));
        log.info("Container for session {} still being ready for new recordings", session.getSessionId());

        String containerId = this.sessionsContainers.get(recording.getSessionId());

        if (session == null) {
            log.warn(
                    "Existing recording {} does not have an active session associated. This usually means a custom recording"
                            + " layout did not join a recorded participant or the recording has been automatically"
                            + " stopped after last user left and timeout passed",
                    recording.getId());
        }

        try {
            dockerManager.runCommandInContainer(containerId, "./composed_quick_start.sh --stop-recording", 10);
        } catch (InterruptedException e1) {
            cleanRecordingMaps(recording);
            log.error("Error stopping recording for session id: {}", session.getSessionId());
            e1.printStackTrace();
        }

        recording = updateRecordingAttributes(recording);

        final String folderPath = this.openviduConfig.getOpenViduRecordingPath() + recording.getId() + "/";
        final String metadataFilePath = folderPath + RecordingManager.RECORDING_ENTITY_FILE + recording.getId();
        this.sealRecordingMetadataFileAsReady(recording, recording.getSize(), recording.getDuration(),
                metadataFilePath);
        cleanRecordingMaps(recording);

        final long timestamp = System.currentTimeMillis();
        this.cdr.recordRecordingStatusChanged(recording, reason, timestamp, recording.getStatus());

        if (session != null && reason != null) {
            this.recordingManager.sessionHandler.sendRecordingStoppedNotification(session, recording, reason);
        }

        // Decrement active recordings
        // ((KurentoSession) session).getKms().getActiveRecordings().decrementAndGet();

        return recording;
    }

    public void runComposedQuickStartContainer(Session session) {
        // Start recording container if output mode=COMPOSED_QUICK_START
        Session recorderSession = session;
        io.openvidu.java.client.Recording.OutputMode defaultOutputMode = recorderSession.getSessionProperties().defaultOutputMode();
        if (io.openvidu.java.client.Recording.OutputMode.COMPOSED_QUICK_START.equals(defaultOutputMode)
                && sessionsContainers.get(recorderSession.getSessionId()) == null) {
            // Retry to run if container is launched for the same session quickly after close it
            int secondsToRetry = 10;
            int secondsBetweenRetries = 1;
            int seconds = 0;
            boolean launched = false;
            while (!launched && seconds < secondsToRetry) {
                try {
                    log.info("Launching COMPOSED_QUICK_START recording container for session: {}", recorderSession.getSessionId());
                    runContainer(recorderSession, new RecordingProperties.Builder().name("")
                            .outputMode(recorderSession.getSessionProperties().defaultOutputMode())
                            .recordingLayout(recorderSession.getSessionProperties().defaultRecordingLayout())
                            .customLayout(recorderSession.getSessionProperties().defaultCustomLayout()).build());
                    log.info("COMPOSED_QUICK_START recording container launched for session: {}", recorderSession.getSessionId());
                    launched = true;
                } catch (Exception e) {
                    log.warn("Failed to launch COMPOSED_QUICK_START recording container for session {}. Trying again in {} seconds", recorderSession.getSessionId(), secondsBetweenRetries);
                    try {
                        Thread.sleep(secondsBetweenRetries * 1000);
                    } catch (InterruptedException e2) {}
                    seconds++;
                } finally {
                    if (seconds == secondsToRetry && !launched) {
                        log.error("Error launchaing COMPOSED_QUICK_ªSTART recording container for session {}", recorderSession.getSessionId());
                    }
                }
            }
        }
    }

    private String runContainer(Session session, RecordingProperties properties) throws Exception {
        log.info("Starting COMPOSED_QUICK_START container for session id: {}", session.getSessionId());

        Recording recording = new Recording(session.getSessionId(), null, properties);
        String layoutUrl = this.getLayoutUrl(recording);

        List<String> envs = new ArrayList<>();
        envs.add("DEBUG_MODE=" + openviduConfig.isOpenViduRecordingDebug());
        envs.add("RECORDING_TYPE=COMPOSED_QUICK_START");
        envs.add("RESOLUTION=" + properties.resolution());
        envs.add("URL=" + layoutUrl);

        log.info("Recorder connecting to url {}", layoutUrl);

        String containerId = null;
        try {
            final String container = RecordingManager.IMAGE_NAME + ":" + RecordingManager.IMAGE_TAG;
            final String containerName = "recording_" + session.getSessionId();
            Volume volume1 = new Volume("/recordings");
            List<Volume> volumes = new ArrayList<>();
            volumes.add(volume1);
            Bind bind1 = new Bind(openviduConfig.getOpenViduRecordingPath(), volume1);
            List<Bind> binds = new ArrayList<>();
            binds.add(bind1);
            containerId = dockerManager.runContainer(container, containerName, null, volumes, binds, "host", envs, null,
                    properties.shmSize(), false, null);
            containers.put(containerId, containerName);
            this.sessionsContainers.put(session.getSessionId(), containerId);
        } catch (Exception e) {
            if (containerId != null) {
                dockerManager.removeDockerContainer(containerId, true);
                containers.remove(containerId);
                sessionsContainers.remove(session.getSessionId());
            }
            log.error("Error while launchig container for COMPOSED_QUICK_START: ({})", e.getMessage());
            throw e;
        }
        return containerId;
    }

}
