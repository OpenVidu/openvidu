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

package io.openvidu.server.recording;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

import org.kurento.client.Composite;
import org.kurento.client.ErrorEvent;
import org.kurento.client.EventListener;
import org.kurento.client.HubPort;
import org.kurento.client.MediaProfileSpecType;
import org.kurento.client.RecorderEndpoint;
import org.kurento.client.RecordingEvent;
import org.kurento.client.StoppedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import io.openvidu.client.OpenViduException;
import io.openvidu.client.OpenViduException.Code;
import io.openvidu.server.kurento.core.KurentoSession;
import io.openvidu.server.kurento.endpoint.PublisherEndpoint;
import io.openvidu.server.utils.RemoteOperationUtils;

public class CompositeWrapper {

	private static final Logger log = LoggerFactory.getLogger(CompositeWrapper.class);

	KurentoSession session;
	Composite composite;
	RecorderEndpoint recorderEndpoint;
	HubPort compositeToRecorderHubPort;
	Map<String, HubPort> hubPorts = new ConcurrentHashMap<>();
	Map<String, PublisherEndpoint> publisherEndpoints = new ConcurrentHashMap<>();

	AtomicBoolean isRecording = new AtomicBoolean(false);
	long startTime;
	long endTime;
	long size;

	public CompositeWrapper(KurentoSession session, String path) {
		this.session = session;
		this.composite = new Composite.Builder(session.getPipeline()).build();
		this.recorderEndpoint = new RecorderEndpoint.Builder(composite.getMediaPipeline(), path)
				.withMediaProfile(MediaProfileSpecType.WEBM_AUDIO_ONLY).build();
		this.compositeToRecorderHubPort = new HubPort.Builder(composite).build();
		this.compositeToRecorderHubPort.connect(recorderEndpoint);
	}

	public synchronized void startCompositeRecording(CountDownLatch startLatch) {

		this.recorderEndpoint.addRecordingListener(new EventListener<RecordingEvent>() {
			@Override
			public void onEvent(RecordingEvent event) {
				startTime = Long.parseLong(event.getTimestampMillis());
				log.info("Recording started event for audio-only RecorderEndpoint of Composite in session {}",
						session.getSessionId());
				startLatch.countDown();
			}
		});

		this.recorderEndpoint.addErrorListener(new EventListener<ErrorEvent>() {
			@Override
			public void onEvent(ErrorEvent event) {
				final String msg = "Event [" + event.getType() + "] endpoint: "
						+ recorderEndpoint.getName() + " | errorCode: " + event.getErrorCode()
						+ " | description: " + event.getDescription() + " | timestamp: "
						+ event.getTimestampMillis();
				log.error(msg);
			}
		});

		this.recorderEndpoint.record();
	}

	public synchronized void stopCompositeRecording(CountDownLatch stopLatch, Long kmsDisconnectionTime) {

		if (kmsDisconnectionTime != null || RemoteOperationUtils.mustSkipRemoteOperation()) {
			// Stopping composite endpoint because of a KMS disconnection
			String msg;
			if (kmsDisconnectionTime != null) {
				endTime = kmsDisconnectionTime;
				msg = "KMS restart";
			} else {
				endTime = System.currentTimeMillis();
				msg = "node crashed";
			}
			stopLatch.countDown();
			log.warn("Forcing composed audio-only recording stop after {} in session {}", msg,
					this.session.getSessionId());
		} else {
			this.recorderEndpoint.addStoppedListener(new EventListener<StoppedEvent>() {
				@Override
				public void onEvent(StoppedEvent event) {
					endTime = Long.parseLong(event.getTimestampMillis());
					log.info("Recording stopped event for audio-only RecorderEndpoint of Composite in session {}",
							session.getSessionId());
					recorderEndpoint.release();
					compositeToRecorderHubPort.release();
					stopLatch.countDown();
				}
			});
			this.recorderEndpoint.stop();
		}

	}

	public void connectPublisherEndpoint(PublisherEndpoint endpoint) throws OpenViduException {
		HubPort hubPort = new HubPort.Builder(composite).build();

		// Block on this call: connections must have been already finished
		// before calling `RecorderEndpoint.record()`.
		endpoint.connect(hubPort, true);

		String streamId = endpoint.getOwner().getPublisherStreamId();
		this.hubPorts.put(streamId, hubPort);
		this.publisherEndpoints.put(streamId, endpoint);

		if (isRecording.compareAndSet(false, true)) {
			// First user publishing. Starting RecorderEndpoint

			log.info("First stream ({}) joined to Composite in session {}. Starting RecorderEndpoint for Composite",
					streamId, session.getSessionId());

			final CountDownLatch startLatch = new CountDownLatch(1);
			this.startCompositeRecording(startLatch);
			try {
				if (!startLatch.await(5, TimeUnit.SECONDS)) {
					log.error("Error waiting for RecorderEndpoint of Composite to start in session {}",
							session.getSessionId());
					throw new OpenViduException(Code.RECORDING_START_ERROR_CODE,
							"Couldn't initialize RecorderEndpoint of Composite");
				}
				log.info("RecorderEnpoint of Composite is now recording for session {}", session.getSessionId());
			} catch (InterruptedException e) {
				log.error("Exception while waiting for state change", e);
			}
		}

		log.info("Composite for session {} has now {} connected publishers", this.session.getSessionId(),
				this.composite.getChildren().size() - 1);
	}

	public void disconnectPublisherEndpoint(String streamId) {
		HubPort hubPort = this.hubPorts.remove(streamId);
		PublisherEndpoint publisherEndpoint = this.publisherEndpoints.remove(streamId);
		publisherEndpoint.disconnectFrom(hubPort);
		if (!RemoteOperationUtils.mustSkipRemoteOperation()) {
			hubPort.release();
		}
		log.info("Composite for session {} has now {} connected publishers", this.session.getSessionId(),
				this.composite.getChildren().size() - 1);
	}

	public void disconnectAllPublisherEndpoints() {
		this.publisherEndpoints.keySet().forEach(streamId -> {
			PublisherEndpoint endpoint = this.publisherEndpoints.get(streamId);
			HubPort hubPort = this.hubPorts.get(streamId);
			endpoint.disconnectFrom(hubPort);
			if (!RemoteOperationUtils.mustSkipRemoteOperation()) {
				hubPort.release();
			}
		});
		this.hubPorts.clear();
		this.publisherEndpoints.clear();
		if (!RemoteOperationUtils.mustSkipRemoteOperation()) {
			this.composite.release();
		}
	}

	public long getDuration() {
		return this.endTime - this.startTime;
	}

}
