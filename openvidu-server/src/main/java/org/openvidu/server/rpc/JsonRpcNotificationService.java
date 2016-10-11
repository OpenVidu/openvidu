/*
 * (C) Copyright 2015 Kurento (http://kurento.org/)
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
 */

package org.openvidu.server.rpc;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

import org.kurento.jsonrpc.Session;
import org.kurento.jsonrpc.Transaction;
import org.kurento.jsonrpc.message.Request;
import org.openvidu.client.OpenViduException;
import org.openvidu.server.core.api.UserNotificationService;
import org.openvidu.server.core.api.pojo.ParticipantRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.google.gson.JsonObject;

/**
 * JSON-RPC implementation of {@link UserNotificationService} for WebSockets.
 *
 * @author <a href="mailto:rvlad@naevatec.com">Radu Tom Vlad</a>
 */
public class JsonRpcNotificationService implements UserNotificationService {
  private static final Logger log = LoggerFactory.getLogger(JsonRpcNotificationService.class);

  private static ConcurrentMap<String, SessionWrapper> sessions = new ConcurrentHashMap<String, SessionWrapper>();

  public SessionWrapper addTransaction(Transaction t, Request<JsonObject> request) {
    String sessionId = t.getSession().getSessionId();
    SessionWrapper sw = sessions.get(sessionId);
    if (sw == null) {
      sw = new SessionWrapper(t.getSession());
      SessionWrapper oldSw = sessions.putIfAbsent(sessionId, sw);
      if (oldSw != null) {
        log.warn("Concurrent initialization of session wrapper #{}", sessionId);
        sw = oldSw;
      }
    }
    sw.addTransaction(request.getId(), t);
    return sw;
  }

  public Session getSession(String sessionId) {
    SessionWrapper sw = sessions.get(sessionId);
    if (sw == null) {
      return null;
    }
    return sw.getSession();
  }

  private Transaction getAndRemoveTransaction(ParticipantRequest participantRequest) {
    Integer tid = null;
    if (participantRequest == null) {
      log.warn("Unable to obtain a transaction for a null ParticipantRequest object");
      return null;
    }
    String tidVal = participantRequest.getRequestId();
    try {
      tid = Integer.parseInt(tidVal);
    } catch (NumberFormatException e) {
      log.error("Invalid transaction id, a number was expected but recv: {}", tidVal, e);
      return null;
    }
    String sessionId = participantRequest.getParticipantId();
    SessionWrapper sw = sessions.get(sessionId);
    if (sw == null) {
      log.warn("Invalid session id {}", sessionId);
      return null;
    }
    log.trace("#{} - {} transactions", sessionId, sw.getTransactions().size());
    Transaction t = sw.getTransaction(tid);
    sw.removeTransaction(tid);
    return t;
  }

  @Override
  public void sendResponse(ParticipantRequest participantRequest, Object result) {
    Transaction t = getAndRemoveTransaction(participantRequest);
    if (t == null) {
      log.error("No transaction found for {}, unable to send result {}", participantRequest, result);
      return;
    }
    try {
      t.sendResponse(result);
    } catch (Exception e) {
      log.error("Exception responding to user ({})", participantRequest, e);
    }
  }

  @Override
  public void sendErrorResponse(ParticipantRequest participantRequest, Object data,
      OpenViduException error) {
    Transaction t = getAndRemoveTransaction(participantRequest);
    if (t == null) {
      log.error("No transaction found for {}, unable to send result {}", participantRequest, data);
      return;
    }
    try {
      String dataVal = data != null ? data.toString() : null;
      t.sendError(error.getCodeValue(), error.getMessage(), dataVal);
    } catch (Exception e) {
      log.error("Exception sending error response to user ({})", participantRequest, e);
    }
  }

  @Override
  public void sendNotification(final String participantId, final String method, final Object params) {
    SessionWrapper sw = sessions.get(participantId);
    if (sw == null || sw.getSession() == null) {
      log.error("No session found for id {}, unable to send notification {}: {}", participantId,
          method, params);
      return;
    }
    Session s = sw.getSession();

    try {
      s.sendNotification(method, params);
    } catch (Exception e) {
      log.error("Exception sending notification '{}': {} to user id {}", method, params,
          participantId, e);
    }
  }

  @Override
  public void closeSession(ParticipantRequest participantRequest) {
    if (participantRequest == null) {
      log.error("No session found for null ParticipantRequest object, " + "unable to cleanup");
      return;
    }
    String sessionId = participantRequest.getParticipantId();
    SessionWrapper sw = sessions.get(sessionId);
    if (sw == null || sw.getSession() == null) {
      log.error("No session found for id {}, unable to cleanup", sessionId);
      return;
    }
    Session s = sw.getSession();
    try {
      ParticipantSession ps = null;
      if (s.getAttributes().containsKey(ParticipantSession.SESSION_KEY)) {
        ps = (ParticipantSession) s.getAttributes().get(ParticipantSession.SESSION_KEY);
      }
      s.close();
      log.info("Closed session for req {} (userInfo:{})", participantRequest, ps);
    } catch (IOException e) {
      log.error("Error closing session for req {}", participantRequest, e);
    }
    sessions.remove(sessionId);
  }

}
