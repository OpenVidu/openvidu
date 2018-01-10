package io.openvidu.server.rpc;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

import org.kurento.jsonrpc.Session;
import org.kurento.jsonrpc.Transaction;
import org.kurento.jsonrpc.message.Request;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.google.gson.JsonObject;

import io.openvidu.client.OpenViduException;

public class RpcNotificationService {

	private static final Logger log = LoggerFactory.getLogger(RpcNotificationService.class);

	private static ConcurrentMap<String, RpcConnection> rpcConnections = new ConcurrentHashMap<>();

	public RpcConnection addTransaction(Transaction t, Request<JsonObject> request) {
		String participantPrivateId = t.getSession().getSessionId();
		RpcConnection connection = rpcConnections.get(participantPrivateId);
		if (connection == null) {
			connection = new RpcConnection(t.getSession());
			RpcConnection oldConnection = rpcConnections.putIfAbsent(participantPrivateId, connection);
			if (oldConnection != null) {
				log.warn("Concurrent initialization of rpcSession #{}", participantPrivateId);
				connection = oldConnection;
			}
		}
		connection.addTransaction(request.getId(), t);
		return connection;
	}

	public void sendResponse(String participantPrivateId, Integer transactionId, Object result) {
		Transaction t = getAndRemoveTransaction(participantPrivateId, transactionId);
		if (t == null) {
			log.error("No transaction {} found for paticipant with private id {}, unable to send result {}",
					transactionId, participantPrivateId, result);
			return;
		}
		try {
			t.sendResponse(result);
		} catch (Exception e) {
			log.error("Exception responding to participant ({})", participantPrivateId, e);
		}
	}

	public void sendErrorResponse(String participantPrivateId, Integer transactionId, Object data,
			OpenViduException error) {
		Transaction t = getAndRemoveTransaction(participantPrivateId, transactionId);
		if (t == null) {
			log.error("No transaction {} found for paticipant with private id {}, unable to send result {}",
					transactionId, participantPrivateId, data);
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
			log.error("No rpc session found for private id {}, unable to send notification {}: {}",
					participantPrivateId, method, params);
			return;
		}
		Session s = rpcSession.getSession();

		try {
			s.sendNotification(method, params);
		} catch (Exception e) {
			log.error("Exception sending notification '{}': {} to participant with private id {}", method, params,
					participantPrivateId, e);
		}
	}

	public void closeRpcSession(String participantPrivateId) {
		RpcConnection rpcSession = rpcConnections.get(participantPrivateId);
		if (rpcSession == null || rpcSession.getSession() == null) {
			log.error("No session found for private id {}, unable to cleanup", participantPrivateId);
			return;
		}
		Session s = rpcSession.getSession();
		try {
			s.close();
			log.info("Closed session for participant with private id {}", participantPrivateId);
		} catch (IOException e) {
			log.error("Error closing session for participant with private id {}", participantPrivateId, e);
		}
		rpcConnections.remove(participantPrivateId);
	}

	private Transaction getAndRemoveTransaction(String participantPrivateId, Integer transactionId) {
		RpcConnection rpcSession = rpcConnections.get(participantPrivateId);
		if (rpcSession == null) {
			log.warn("Invalid WebSocket session id {}", participantPrivateId);
			return null;
		}
		log.trace("#{} - {} transactions", participantPrivateId, rpcSession.getTransactions().size());
		Transaction t = rpcSession.getTransaction(transactionId);
		rpcSession.removeTransaction(transactionId);
		return t;
	}

	public void showRpcConnections() {
		log.info("<PRIVATE_ID, RPC_CONNECTION>: {}", RpcNotificationService.rpcConnections.toString());
	}

}
