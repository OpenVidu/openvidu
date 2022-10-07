package io.openvidu.server.recording.service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.github.dockerjava.api.model.Bind;
import com.github.dockerjava.api.model.Volume;

import io.openvidu.client.OpenViduException;
import io.openvidu.client.OpenViduException.Code;
import io.openvidu.java.client.RecordingProperties;
import io.openvidu.server.cdr.CallDetailRecord;
import io.openvidu.server.config.OpenviduConfig;
import io.openvidu.server.core.EndReason;
import io.openvidu.server.core.Session;
import io.openvidu.server.kurento.kms.KmsManager;
import io.openvidu.server.recording.Recording;
import io.openvidu.server.recording.RecordingDownloader;
import io.openvidu.server.recording.RecordingUploader;
import io.openvidu.server.utils.CustomFileManager;
import io.openvidu.server.utils.DockerManager;
import io.openvidu.server.utils.RecordingUtils;

public class ComposedQuickStartRecordingService extends ComposedRecordingService {

	private static final Logger log = LoggerFactory.getLogger(ComposedRecordingService.class);

	public ComposedQuickStartRecordingService(RecordingManager recordingManager,
			RecordingDownloader recordingDownloader, RecordingUploader recordingUploader, KmsManager kmsManager,
			CustomFileManager fileManager, OpenviduConfig openviduConfig, CallDetailRecord cdr,
			DockerManager dockerManager) {
		super(recordingManager, recordingDownloader, recordingUploader, kmsManager, fileManager, openviduConfig, cdr,
				dockerManager);
	}

	public void stopRecordingContainer(Session session, EndReason reason) {
		log.info("Stopping COMPOSED_QUICK_START of session {}. Reason: {}", session.getSessionId(),
				RecordingManager.finalReason(reason));

		String containerId = this.sessionsContainers.get(session.getSessionId());

		if (containerId != null) {
			try {
				dockerManager.removeContainer(session.getMediaNodeId(), containerId, true);
			} catch (Exception e) {
				log.error("Can't remove COMPOSED_QUICK_START recording container from session {}",
						session.getSessionId());
			}

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
		envs.add("FRAMERATE=" + properties.frameRate());
		envs.add("ONLY_VIDEO=" + !properties.hasAudio());
		envs.add("VIDEO_ID=" + recording.getId());
		envs.add("VIDEO_NAME=" + properties.name());
		envs.add("VIDEO_FORMAT=mp4");
		envs.add("RECORDING_JSON='" + recording.toJson(true).toString() + "'");

		String containerId = this.sessionsContainers.get(session.getSessionId());
		try {
			String recordExecCommand = "";
			for (int i = 0; i < envs.size(); i++) {
				if (i > 0) {
					recordExecCommand += "&& ";
				}
				recordExecCommand += "export " + envs.get(i) + " ";
			}
			recordExecCommand += "&& ./composed_quick_start.sh --start-recording > /var/log/ffmpeg.log 2>&1 &";
			dockerManager.runCommandInContainerAsync(recording.getRecordingProperties().mediaNode(), containerId,
					recordExecCommand);
		} catch (Exception e) {
			this.cleanRecordingMaps(recording);
			throw this.failStartRecording(session, recording,
					"Couldn't initialize recording container. Error: " + e.getMessage());
		}

		this.sessionsContainers.put(session.getSessionId(), containerId);

		try {
			this.waitForVideoFileNotEmpty(recording);
		} catch (Exception e) {
			this.cleanRecordingMaps(recording);
			throw this.failStartRecording(session, recording,
					"Couldn't initialize recording container. Error: " + e.getMessage());
		}

		if (this.openviduConfig.isRecordingComposedExternal()) {
			this.generateRecordingMetadataFile(recording);
		}

		return recording;
	}

	@Override
	protected Recording stopRecordingWithVideo(Session session, Recording recording, EndReason reason) {
		log.info("Stopping COMPOSED_QUICK_START ({}) recording {} of session {}. Reason: {}",
				recording.hasAudio() ? "video + audio" : "audio-only", recording.getId(), recording.getSessionId(),
				RecordingManager.finalReason(reason));
		log.info("Container for session {} still ready for new recordings", recording.getSessionId());

		String containerId = this.sessionsContainers.get(recording.getSessionId());

		if (session == null) {
			log.warn(
					"Existing recording {} does not have an active session associated. This usually means a custom recording"
							+ " layout did not join a recorded participant or the recording has been automatically"
							+ " stopped after last user left and timeout passed",
					recording.getId());
		}

		try {
			dockerManager.runCommandInContainerSync(recording.getRecordingProperties().mediaNode(), containerId,
					"./composed_quick_start.sh --stop-recording", 10);
		} catch (IOException e1) {
			log.error("Error stopping COMPOSED_QUICK_START recording {}: {}", recording.getId(), e1.getMessage());
			failRecordingCompletion(recording, containerId, true,
					new OpenViduException(Code.RECORDING_COMPLETION_ERROR_CODE, e1.getMessage()));
		}

		if (this.openviduConfig.isRecordingComposedExternal()) {
			try {
				waitForComposedQuickStartFiles(recording);
			} catch (Exception e) {
				failRecordingCompletion(recording, containerId, false,
						new OpenViduException(Code.RECORDING_COMPLETION_ERROR_CODE, e.getMessage()));
			}
		}

		if (session != null && reason != null) {
			this.recordingManager.sessionHandler.sendRecordingStoppedNotification(session, recording, reason);
		}

		downloadComposedRecording(session, recording, reason);

		return recording;
	}

	public void runComposedQuickStartContainer(Session session) {
		// Start recording container if output mode=COMPOSED_QUICK_START
		Session recorderSession = session;
		io.openvidu.java.client.Recording.OutputMode defaultOutputMode = recorderSession.getSessionProperties()
				.defaultRecordingProperties().outputMode();
		if (io.openvidu.java.client.Recording.OutputMode.COMPOSED_QUICK_START.equals(defaultOutputMode)
				&& sessionsContainers.get(recorderSession.getSessionId()) == null) {
			// Retry to run if container is launched for the same session quickly after
			// close it
			int secondsToRetry = 10;
			int secondsBetweenRetries = 1;
			int seconds = 0;
			boolean launched = false;
			while (!launched && seconds < secondsToRetry) {
				try {
					log.info("Launching COMPOSED_QUICK_START recording container for session: {}",
							recorderSession.getSessionId());
					RecordingProperties props = RecordingUtils.RECORDING_PROPERTIES_WITH_MEDIA_NODE(recorderSession);
					runContainer(recorderSession, props);
					log.info("COMPOSED_QUICK_START recording container launched for session: {}",
							recorderSession.getSessionId());
					launched = true;
				} catch (Exception e) {
					log.warn(
							"Failed to launch COMPOSED_QUICK_START recording container for session {}. Trying again in {} seconds",
							recorderSession.getSessionId(), secondsBetweenRetries);
					try {
						Thread.sleep(secondsBetweenRetries * 1000);
					} catch (InterruptedException e2) {
					}
					seconds++;
				} finally {
					if (seconds == secondsToRetry && !launched) {
						log.error("Error launchaing COMPOSED_QUICK_ªSTART recording container for session {}",
								recorderSession.getSessionId());
					}
				}
			}
		}
	}

	private String runContainer(Session session, RecordingProperties properties) throws Exception {
		log.info("Starting COMPOSED_QUICK_START container for session id: {}", session.getSessionId());

		Recording recording = new Recording(session.getSessionId(), session.getUniqueSessionId(), null, properties);
		String layoutUrl = this.getLayoutUrl(recording);

		List<String> envs = new ArrayList<>();
		envs.add("DEBUG_MODE=" + openviduConfig.isOpenViduRecordingDebug());
		envs.add("RECORDING_TYPE=COMPOSED_QUICK_START");
		envs.add("RESOLUTION=" + properties.resolution());
		envs.add("FRAMERATE=" + properties.frameRate());
		envs.add("URL=" + layoutUrl);

		log.info("Recorder connecting to url {}", layoutUrl);

		String containerId = null;
		try {
			final String container = openviduConfig.getOpenviduRecordingImageRepo() + ":"
					+ openviduConfig.getOpenViduRecordingVersion();
			final String containerName = "recording_" + session.getSessionId();
			Volume volume1 = new Volume("/recordings");
			List<Volume> volumes = new ArrayList<>();
			volumes.add(volume1);
			Bind bind1 = new Bind(openviduConfig.getOpenViduRecordingPath(properties.mediaNode()), volume1);
			List<Bind> binds = new ArrayList<>();
			binds.add(bind1);
			containerId = dockerManager.runContainer(properties.mediaNode(), container, containerName, null, volumes,
					binds, "host", envs, null, properties.shmSize(), false, null,
					openviduConfig.isOpenviduRecordingGPUEnabled());
			this.sessionsContainers.put(session.getSessionId(), containerId);
		} catch (Exception e) {
			if (containerId != null) {
				dockerManager.removeContainer(properties.mediaNode(), containerId, true);
				sessionsContainers.remove(session.getSessionId());
			}
			log.error("Error while launching container for COMPOSED_QUICK_START: ({})", e.getMessage());
			throw e;
		}
		return containerId;
	}

	private void waitForComposedQuickStartFiles(Recording recording) throws Exception {

		final int SECONDS_MAX_WAIT = fileManager.maxSecondsWaitForFile();
		final String PATH = this.openviduConfig.getOpenViduRecordingPath(recording.getRecordingProperties().mediaNode()) + recording.getId() + "/";

		// Waiting for the files generated at the end of the stopping process: the
		// ffprobe info and the thumbnail
		final String INFO_FILE = PATH + recording.getId() + RecordingService.COMPOSED_INFO_FILE_EXTENSION;
		final String THUMBNAIL_FILE = PATH + recording.getId() + RecordingService.COMPOSED_THUMBNAIL_EXTENSION;

		Set<String> filesToWaitFor = Stream.of(INFO_FILE, THUMBNAIL_FILE).collect(Collectors.toSet());

		Collection<Thread> waitForFileThreads = new HashSet<>();
		CountDownLatch latch = new CountDownLatch(filesToWaitFor.size());

		for (final String file : filesToWaitFor) {
			Thread downloadThread = new Thread() {
				@Override
				public void run() {
					try {
						fileManager.waitForFileToExistAndNotEmpty(recording.getRecordingProperties().mediaNode(), file);
					} catch (Exception e) {
						log.error(e.getMessage());
						recording.setStatus(io.openvidu.java.client.Recording.Status.failed);
					} finally {
						latch.countDown();
					}
				}
			};
			waitForFileThreads.add(downloadThread);
		}
		waitForFileThreads.forEach(t -> t.start());

		try {
			if (!latch.await(SECONDS_MAX_WAIT, TimeUnit.SECONDS)) {
				recording.setStatus(io.openvidu.java.client.Recording.Status.failed);
				String msg = "The wait for files of COMPOSED_QUICK_START recording " + recording.getId()
						+ " didn't complete in " + fileManager.maxSecondsWaitForFile() + " seconds";
				log.error(msg);
				throw new Exception(msg);
			} else {
				if (io.openvidu.java.client.Recording.Status.failed.equals(recording.getStatus())) {
					String msg = "Error waiting for some COMPOSED_QUICK_START recording file in recording "
							+ recording.getId();
					log.error(msg);
					throw new Exception(msg);
				} else {
					log.info("All files of COMPOSED_QUICK_START recording {} are available to download",
							recording.getId());
				}
			}
		} catch (InterruptedException e) {
			recording.setStatus(io.openvidu.java.client.Recording.Status.failed);
			String msg = "Error waiting for COMPOSED_QUICK_START recording files of recording " + recording.getId()
					+ ": " + e.getMessage();
			log.error(msg);
			throw new Exception(msg);
		}
	}

}
