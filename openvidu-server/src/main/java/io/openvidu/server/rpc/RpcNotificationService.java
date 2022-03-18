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

package io.openvidu.server.rpc;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

import org.kurento.commons.exception.KurentoException;
import org.kurento.jsonrpc.Session;
import org.kurento.jsonrpc.Transaction;
import org.kurento.jsonrpc.message.Request;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.google.gson.JsonObject;

import io.openvidu.client.OpenViduException;
import io.openvidu.server.core.IdentifierPrefixes;

public class RpcNotificationService {

	private static final Logger log = LoggerFactory.getLogger(RpcNotificationService.class);

	private ConcurrentMap<String, RpcConnection> rpcConnections = new ConcurrentHashMap<>();

	private ScheduledExecutorService closeWsScheduler = Executors
			.newScheduledThreadPool(Runtime.getRuntime().availableProcessors());

	public RpcConnection newRpcConnection(Transaction t, Request<JsonObject> request) {
		String participantPrivateId = t.getSession().getSessionId();
		RpcConnection connection = new RpcConnection(t.getSession());
		RpcConnection oldConnection = rpcConnections.putIfAbsent(participantPrivateId, connection);
		if (oldConnection != null) {
			log.warn("Concurrent initialization of rpcSession {}", participantPrivateId);
			connection = oldConnection;
		}
		return connection;
	}

	public RpcConnection addTransaction(Transaction t, Request<JsonObject> request) {
		String participantPrivateId = t.getSession().getSessionId();
		RpcConnection connection = rpcConnections.get(participantPrivateId);
		connection.addTransaction(request.getId(), t);
		return connection;
	}

	public void sendResponse(String participantPrivateId, Integer transactionId, Object result) {
		Transaction t = getAndRemoveTransaction(participantPrivateId, transactionId);
		if (t == null) {
			if (!isIpcamParticipant(participantPrivateId)) {
				log.error("No transaction {} found for paticipant with private id {}, unable to send result {}",
						transactionId, participantPrivateId, result);
			}
			return;
		}
		try {
			t.sendResponse(result);
		} catch (KurentoException e) {
			if (e.getCause() instanceof IllegalStateException) {
				log.warn("Response couldn't be sent to participant with privateId {}: {}", participantPrivateId,
						e.getCause().getMessage());
			} else {
				log.error("Exception responding to participant ({})", participantPrivateId, e);
			}
		} catch (Exception e) {
			log.error("Exception responding to participant ({})", participantPrivateId, e);
		}
	}

	public void sendErrorResponse(String participantPrivateId, Integer transactionId, Object data,
			OpenViduException error) {
		Transaction t = getAndRemoveTransaction(participantPrivateId, transactionId);
		if (t == null) {
			if (!isIpcamParticipant(participantPrivateId)) {
				log.error("No transaction {} found for paticipant with private id {}, unable to send result {}",
						transactionId, participantPrivateId, data);
			}
			return;
		}
		try {
			String dataVal = data != null ? data.toString() : null;
			t.sendError(error.getCodeValue(), error.getMessage(), dataVal);
		} catch (Exception e) {
			log.error("Exception sending error response to user ({})", transactionId, e);
		}
	}

	public void sendNotification(final String participantPrivateId, final String method, final Object params) {
		RpcConnection rpcSession = rpcConnections.get(participantPrivateId);
		if (rpcSession == null || rpcSession.getSession() == null) {
			if (!isIpcamParticipant(participantPrivateId)) {
				log.error("No rpc session found for private id {}, unable to send notification {}: {}",
						participantPrivateId, method, params);
			}
			return;
		}
		Session s = rpcSession.getSession();

		try {
			s.sendNotification(method, params);
		} catch (KurentoException e) {
			if (e.getCause() instanceof IllegalStateException) {
				log.warn("Notification '{}' couldn't be sent to participant with privateId {}: {}", method,
						participantPrivateId, e.getCause().getMessage());
			} else {
				log.error("Exception sending notification '{}': {} to participant with private id {}", method, params,
						participantPrivateId, e);
			}
		} catch (Exception e) {
			log.error("Exception sending notification '{}': {} to participant with private id {}", method, params,
					participantPrivateId, e);
		}
	}

	public RpcConnection immediatelyCloseRpcSession(String participantPrivateId) {
		RpcConnection rpcSession = rpcConnections.remove(participantPrivateId);
		if (rpcSession == null || rpcSession.getSession() == null) {
			if (!isIpcamParticipant(participantPrivateId)) {
				log.error("No rpc session found for private id {}, unable to cleanup", participantPrivateId);
			}
			return null;
		}
		Session s = rpcSession.getSession();
		try {
			s.close();
			log.info("Closed rpc session for participant with private id {}", participantPrivateId);
			this.showRpcConnections();
			return rpcSession;
		} catch (IOException e) {
			log.error("Error closing rpc session for participant with private id {}: {}", participantPrivateId,
					e.getMessage());
		}
		return null;
	}

	public void scheduleCloseRpcSession(String participantPrivateId, int timeoutMs) {
		closeWsScheduler.schedule(() -> immediatelyCloseRpcSession(participantPrivateId), timeoutMs,
				TimeUnit.MILLISECONDS);
	}

	private Transaction getAndRemoveTransaction(String participantPrivateId, Integer transactionId) {
		RpcConnection rpcSession = rpcConnections.get(participantPrivateId);
		if (rpcSession == null) {
			if (!isIpcamParticipant(participantPrivateId)) {
				log.warn("Invalid WebSocket session id {}", participantPrivateId);
			}
			return null;
		}
		log.trace("#{} - {} transactions", participantPrivateId, rpcSession.getTransactions().size());
		Transaction t = rpcSession.getTransaction(transactionId);
		rpcSession.removeTransaction(transactionId);
		return t;
	}

	public void showRpcConnections() {
		log.info("<PRIVATE_ID, RPC_CONNECTION>: {}", this.rpcConnections.toString());
	}

	public RpcConnection getRpcConnection(String participantPrivateId) {
		return this.rpcConnections.get(participantPrivateId);
	}

	private boolean isIpcamParticipant(String participantPrivateId) {
		return participantPrivateId.startsWith(IdentifierPrefixes.IPCAM_ID);
	}

}
