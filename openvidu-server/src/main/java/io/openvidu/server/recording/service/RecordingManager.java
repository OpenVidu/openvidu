/*
 * (C) Copyright 2017-2019 OpenVidu (https://openvidu.io/)
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

package io.openvidu.server.recording.service;

import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.ScheduledThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

import javax.ws.rs.ProcessingException;

import org.kurento.client.MediaProfileSpecType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import io.openvidu.client.OpenViduException;
import io.openvidu.client.OpenViduException.Code;
import io.openvidu.java.client.RecordingProperties;
import io.openvidu.server.config.OpenviduConfig;
import io.openvidu.server.core.Participant;
import io.openvidu.server.core.Session;
import io.openvidu.server.core.SessionEventsHandler;
import io.openvidu.server.recording.Recording;

public class RecordingManager {

	private static final Logger log = LoggerFactory.getLogger(RecordingManager.class);

	RecordingService recordingService;
	private ComposedRecordingService composedRecordingService;
	private SingleStreamRecordingService singleStreamRecordingService;

	@Autowired
	protected SessionEventsHandler sessionHandler;

	@Autowired
	protected OpenviduConfig openviduConfig;

	protected Map<String, Recording> startingRecordings = new ConcurrentHashMap<>();
	protected Map<String, Recording> startedRecordings = new ConcurrentHashMap<>();
	protected Map<String, Recording> sessionsRecordings = new ConcurrentHashMap<>();
	private final Map<String, ScheduledFuture<?>> automaticRecordingStopThreads = new ConcurrentHashMap<>();

	private ScheduledThreadPoolExecutor automaticRecordingStopExecutor = new ScheduledThreadPoolExecutor(
			Runtime.getRuntime().availableProcessors());

	static final String RECORDING_ENTITY_FILE = ".recording.";

	private static final List<String> LAST_PARTICIPANT_LEFT_REASONS = Arrays.asList(
			new String[] { "disconnect", "forceDisconnectByUser", "forceDisconnectByServer", "networkDisconnect" });

	public SessionEventsHandler getSessionEventsHandler() {
		return this.sessionHandler;
	}

	public void initializeRecordingManager() {

		this.composedRecordingService = new ComposedRecordingService(this, openviduConfig);
		this.singleStreamRecordingService = new SingleStreamRecordingService(this, openviduConfig);

		ComposedRecordingService recServiceAux = this.composedRecordingService;
		recServiceAux.setRecordingContainerVersion(openviduConfig.getOpenViduRecordingVersion());

		log.info("Recording module required: Downloading openvidu/openvidu-recording:"
				+ openviduConfig.getOpenViduRecordingVersion() + " Docker image (800 MB aprox)");

		boolean imageExists = false;
		try {
			imageExists = recServiceAux.recordingImageExistsLocally();
		} catch (ProcessingException exception) {
			String message = "Exception connecting to Docker daemon: ";
			if ("docker".equals(openviduConfig.getSpringProfile())) {
				final String NEW_LINE = System.getProperty("line.separator");
				message += "make sure you include the following flags in your \"docker run\" command:" + NEW_LINE
						+ "    -e openvidu.recording.path=/YOUR/PATH/TO/VIDEO/FILES" + NEW_LINE
						+ "    -e MY_UID=$(id -u $USER)" + NEW_LINE + "    -v /var/run/docker.sock:/var/run/docker.sock"
						+ NEW_LINE + "    -v /YOUR/PATH/TO/VIDEO/FILES:/YOUR/PATH/TO/VIDEO/FILES" + NEW_LINE;
			} else {
				message += "you need Docker installed in this machine to enable OpenVidu recording service";
			}
			log.error(message);
			throw new RuntimeException(message);
		}

		if (imageExists) {
			log.info("Docker image already exists locally");
		} else {
			Thread t = new Thread(() -> {
				boolean keep = true;
				log.info("Downloading ");
				while (keep) {
					System.out.print(".");
					try {
						Thread.sleep(1000);
					} catch (InterruptedException e) {
						keep = false;
						log.info("\nDownload complete");
					}
				}
			});
			t.start();
			recServiceAux.downloadRecordingImage();
			t.interrupt();
			try {
				t.join();
			} catch (InterruptedException e) {
				e.printStackTrace();
			}
			log.info("Docker image available");
		}
		this.initRecordingPath();

		this.recordingService = recServiceAux;
	}

	public Recording startRecording(Session session, RecordingProperties properties) throws OpenViduException {
		Recording recording = null;
		try {
			switch (properties.outputMode()) {
			case COMPOSED:
				recording = this.composedRecordingService.startRecording(session, properties);
				break;
			case INDIVIDUAL:
				recording = this.singleStreamRecordingService.startRecording(session, properties);
				break;
			}
		} catch (OpenViduException e) {
			throw e;
		}
		if (session.getActivePublishers() == 0) {
			// Init automatic recording stop if there are now publishers when starting
			// recording
			this.initAutomaticRecordingStopThread(session.getSessionId());
		}
		return recording;
	}

	public Recording stopRecording(Session session, String recordingId, String reason) {
		Recording recording;
		if (session == null) {
			recording = this.startedRecordings.remove(recordingId);
		} else {
			recording = this.sessionsRecordings.remove(session.getSessionId());
		}
		switch (recording.getOutputMode()) {
		case COMPOSED:
			recording = this.composedRecordingService.stopRecording(session, recording, reason);
			break;
		case INDIVIDUAL:
			recording = this.singleStreamRecordingService.stopRecording(session, recording, reason);
			break;
		}
		return recording;
	}

	public void startOneIndividualStreamRecording(Session session, String recordingId, MediaProfileSpecType profile,
			Participant participant) {
		Recording recording = this.sessionsRecordings.get(session.getSessionId());
		if (recording == null) {
			log.error("Cannot start recording of new stream {}. Session {} is not being recorded",
					participant.getPublisherStreamId(), session.getSessionId());
		}
		if (io.openvidu.java.client.Recording.OutputMode.INDIVIDUAL.equals(recording.getOutputMode())) {
			final CountDownLatch startedCountDown = new CountDownLatch(1);
			this.singleStreamRecordingService.startOneIndividualStreamRecording(session, recordingId, profile,
					participant, startedCountDown);
		}
	}

	public void stopOneIndividualStreamRecording(String sessionId, String streamId) {
		Recording recording = this.sessionsRecordings.get(sessionId);
		if (io.openvidu.java.client.Recording.OutputMode.INDIVIDUAL.equals(recording.getOutputMode())) {
			final CountDownLatch stoppedCountDown = new CountDownLatch(1);
			this.singleStreamRecordingService.stopOneIndividualStreamRecording(sessionId, streamId, stoppedCountDown);
			try {
				if (!stoppedCountDown.await(5, TimeUnit.SECONDS)) {
					log.error("Error waiting for recorder endpoint of stream {} to stop in session {}", streamId,
							sessionId);
				}
			} catch (InterruptedException e) {
				log.error("Exception while waiting for state change", e);
			}
		}
	}

	public boolean sessionIsBeingRecorded(String sessionId) {
		return (this.sessionsRecordings.get(sessionId) != null);
	}

	public boolean sessionIsBeingRecordedIndividual(String sessionId) {
		Recording rec = this.sessionsRecordings.get(sessionId);
		return (rec != null && io.openvidu.java.client.Recording.OutputMode.INDIVIDUAL.equals(rec.getOutputMode()));
	}

	public boolean sessionIsBeingRecordedComposed(String sessionId) {
		Recording rec = this.sessionsRecordings.get(sessionId);
		return (rec != null && io.openvidu.java.client.Recording.OutputMode.COMPOSED.equals(rec.getOutputMode()));
	}

	public Recording getStartedRecording(String recordingId) {
		return this.startedRecordings.get(recordingId);
	}

	public Recording getStartingRecording(String recordingId) {
		return this.startingRecordings.get(recordingId);
	}

	public Collection<Recording> getFinishedRecordings() {
		return this.getAllRecordingsFromHost().stream()
				.filter(recording -> (recording.getStatus().equals(io.openvidu.java.client.Recording.Status.stopped)
						|| recording.getStatus().equals(io.openvidu.java.client.Recording.Status.available)))
				.collect(Collectors.toSet());
	}

	public Recording getRecording(String recordingId) {
		return this.getRecordingFromHost(recordingId);
	}

	public Collection<Recording> getAllRecordings() {
		return this.getAllRecordingsFromHost();
	}

	public String getFreeRecordingId(String sessionId, String shortSessionId) {
		Set<String> recordingIds = this.getRecordingIdsFromHost();
		String recordingId = shortSessionId;
		boolean isPresent = recordingIds.contains(recordingId);
		int i = 1;

		while (isPresent) {
			recordingId = shortSessionId + "-" + i;
			i++;
			isPresent = recordingIds.contains(recordingId);
		}

		return recordingId;
	}

	public HttpStatus deleteRecordingFromHost(String recordingId, boolean force) {

		if (!force && (this.startedRecordings.containsKey(recordingId)
				|| this.startingRecordings.containsKey(recordingId))) {
			// Cannot delete an active recording
			return HttpStatus.CONFLICT;
		}

		Recording recording = getRecordingFromHost(recordingId);
		if (recording == null) {
			return HttpStatus.NOT_FOUND;
		}

		File folder = new File(this.openviduConfig.getOpenViduRecordingPath());
		File[] files = folder.listFiles();
		for (int i = 0; i < files.length; i++) {
			if (files[i].isDirectory() && files[i].getName().equals(recordingId)) {
				// Correct folder. Delete all content and the folder itself
				File[] allContents = files[i].listFiles();
				if (allContents != null) {
					for (File file : allContents) {
						file.delete();
					}
				}
				files[i].delete();
				break;
			}
		}

		return HttpStatus.NO_CONTENT;
	}

	public Recording getRecordingFromEntityFile(File file) {
		if (file.isFile() && file.getName().startsWith(RecordingManager.RECORDING_ENTITY_FILE)) {
			JsonObject json = null;
			try {
				json = new JsonParser().parse(new FileReader(file)).getAsJsonObject();
			} catch (IOException e) {
				return null;
			}
			return new Recording(json);
		}
		return null;
	}

	public void initAutomaticRecordingStopThread(String sessionId) {
		final String recordingId = this.sessionsRecordings.get(sessionId).getId();
		ScheduledFuture<?> future = this.automaticRecordingStopExecutor.schedule(() -> {
			log.info("Stopping recording {} after 2 minutes wait (no publisher published before timeout)", recordingId);
			this.stopRecording(null, recordingId, "lastParticipantLeft");
			this.automaticRecordingStopThreads.remove(sessionId);
		}, 2, TimeUnit.MINUTES);
		this.automaticRecordingStopThreads.putIfAbsent(sessionId, future);
	}

	public boolean abortAutomaticRecordingStopThread(String sessionId) {
		ScheduledFuture<?> future = this.automaticRecordingStopThreads.remove(sessionId);
		if (future != null) {
			return future.cancel(false);
		} else {
			return true;
		}
	}

	public Recording updateRecordingUrl(Recording recording) {
		if (openviduConfig.getOpenViduRecordingPublicAccess()) {
			if (io.openvidu.java.client.Recording.Status.stopped.equals(recording.getStatus())) {

				String extension;
				switch (recording.getOutputMode()) {
				case COMPOSED:
					extension = "mp4";
					break;
				case INDIVIDUAL:
					extension = "zip";
					break;
				default:
					extension = "mp4";
				}

				recording.setUrl(this.openviduConfig.getFinalUrl() + "recordings/" + recording.getId() + "/"
						+ recording.getName() + "." + extension);
				recording.setStatus(io.openvidu.java.client.Recording.Status.available);
			}
		}
		return recording;
	}

	private Recording getRecordingFromHost(String recordingId) {
		log.info(this.openviduConfig.getOpenViduRecordingPath() + recordingId + "/"
				+ RecordingManager.RECORDING_ENTITY_FILE + recordingId);
		File file = new File(this.openviduConfig.getOpenViduRecordingPath() + recordingId + "/"
				+ RecordingManager.RECORDING_ENTITY_FILE + recordingId);
		log.info("File exists: " + file.exists());
		Recording recording = this.getRecordingFromEntityFile(file);
		if (recording != null) {
			this.updateRecordingUrl(recording);
		}
		return recording;
	}

	private Set<Recording> getAllRecordingsFromHost() {
		File folder = new File(this.openviduConfig.getOpenViduRecordingPath());
		File[] files = folder.listFiles();

		Set<Recording> recordingEntities = new HashSet<>();
		for (int i = 0; i < files.length; i++) {
			if (files[i].isDirectory()) {
				File[] innerFiles = files[i].listFiles();
				for (int j = 0; j < innerFiles.length; j++) {
					Recording recording = this.getRecordingFromEntityFile(innerFiles[j]);
					if (recording != null) {
						this.updateRecordingUrl(recording);
						recordingEntities.add(recording);
					}
				}
			}
		}
		return recordingEntities;
	}

	private Set<String> getRecordingIdsFromHost() {
		File folder = new File(this.openviduConfig.getOpenViduRecordingPath());
		File[] files = folder.listFiles();

		Set<String> fileNamesNoExtension = new HashSet<>();
		for (int i = 0; i < files.length; i++) {
			if (files[i].isDirectory()) {
				File[] innerFiles = files[i].listFiles();
				for (int j = 0; j < innerFiles.length; j++) {
					if (innerFiles[j].isFile()
							&& innerFiles[j].getName().startsWith(RecordingManager.RECORDING_ENTITY_FILE)) {
						fileNamesNoExtension
								.add(innerFiles[j].getName().replaceFirst(RecordingManager.RECORDING_ENTITY_FILE, ""));
						break;
					}
				}
			}
		}
		return fileNamesNoExtension;
	}

	private File initRecordingPath() throws OpenViduException {
		try {
			Path path = Files.createDirectories(Paths.get(this.openviduConfig.getOpenViduRecordingPath()));

			if (!Files.isWritable(path)) {
				throw new OpenViduException(Code.RECORDING_PATH_NOT_VALID,
						"The recording path '" + this.openviduConfig.getOpenViduRecordingPath()
								+ "' is not valid. Reason: OpenVidu Server process needs write permissions");
			}

			log.info("Recording path: {}", this.openviduConfig.getOpenViduRecordingPath());
			return path.toFile();
		} catch (IOException e) {
			throw new OpenViduException(Code.RECORDING_PATH_NOT_VALID,
					"The recording path '" + this.openviduConfig.getOpenViduRecordingPath() + "' is not valid. Reason: "
							+ e.getClass().getName());
		}
	}

	public static String finalReason(String reason) {
		if (RecordingManager.LAST_PARTICIPANT_LEFT_REASONS.contains(reason)) {
			return "lastParticipantLeft";
		} else {
			return reason;
		}
	}

}
