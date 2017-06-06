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

package io.openvidu.demo;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.kurento.client.KurentoClient;
import org.kurento.jsonrpc.Session;
import io.openvidu.client.OpenViduException;
import io.openvidu.server.core.internal.DefaultKurentoClientSessionInfo;
import io.openvidu.server.kms.Kms;
import io.openvidu.server.kms.KmsManager;
import io.openvidu.server.kms.MaxWebRtcLoadManager;
import io.openvidu.server.rpc.JsonRpcNotificationService;
import io.openvidu.server.rpc.ParticipantSession;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;

/**
 * KMS manager for the room demo app.
 *
 * @author Radu Tom Vlad (rvlad@naevatec.com)
 * @since 6.0.0
 */
public class FixedNKmsManager extends KmsManager {
  private static final Logger log = LoggerFactory.getLogger(FixedNKmsManager.class);

  private String authRegex;
  private static Pattern authPattern = null;

  @Autowired
  private JsonRpcNotificationService notificationService;

  public FixedNKmsManager(List<String> kmsWsUri) {
    for (String uri : kmsWsUri) {
      this.addKms(new Kms(KurentoClient.create(uri), uri));
    }
  }

  public FixedNKmsManager(List<String> kmsWsUri, int kmsLoadLimit) {
    for (String uri : kmsWsUri) {
      Kms kms = new Kms(KurentoClient.create(uri), uri);
      kms.setLoadManager(new MaxWebRtcLoadManager(kmsLoadLimit));
      this.addKms(kms);
    }
  }

  public synchronized void setAuthRegex(String regex) {
    this.authRegex = regex != null ? regex.trim() : null;
    if (authRegex != null && !authRegex.isEmpty()) {
      authPattern = Pattern.compile(authRegex, Pattern.UNICODE_CASE | Pattern.CASE_INSENSITIVE);
    }
  }

  @Override
  public synchronized Kms getKms(DefaultKurentoClientSessionInfo sessionInfo) {
    String userName = null;
    String participantId = sessionInfo.getParticipantId();
    Session session = notificationService.getSession(participantId);
    if (session != null) {
      Object sessionValue = session.getAttributes().get(ParticipantSession.SESSION_KEY);
      if (sessionValue != null) {
        ParticipantSession participantSession = (ParticipantSession) sessionValue;
        userName = participantSession.getParticipantName();
      }
    }
    if (userName == null) {
      log.warn("Unable to find user name in session {}", participantId);
      throw new OpenViduException(OpenViduException.Code.ROOM_CANNOT_BE_CREATED_ERROR_CODE,
          "Not enough information");
    }
    if (!canCreateRoom(userName)) {
      throw new OpenViduException(OpenViduException.Code.ROOM_CANNOT_BE_CREATED_ERROR_CODE,
          "User cannot create a new room");
    }
    Kms kms = null;
    String type = "";
    boolean hq = isUserHQ(userName);
    if (hq) {
      kms = getLessLoadedKms();
    } else {
      kms = getNextLessLoadedKms();
      if (!kms.allowMoreElements()) {
        kms = getLessLoadedKms();
      } else {
        type = "next ";
      }
    }
    if (!kms.allowMoreElements()) {
      log.debug(
          "Was trying Kms which has no resources left: highQ={}, " + "{}less loaded KMS, uri={}",
          hq, type, kms.getUri());
      throw new OpenViduException(OpenViduException.Code.ROOM_CANNOT_BE_CREATED_ERROR_CODE,
          "No resources left to create new room");
    }
    log.debug("Offering Kms: highQ={}, {}less loaded KMS, uri={}", hq, type, kms.getUri());
    return kms;
  }

  private boolean isUserHQ(String userName) {
    return userName.toLowerCase().startsWith("special");
  }

  private boolean canCreateRoom(String userName) {
    if (authPattern == null) {
      return true;
    }
    Matcher m = authPattern.matcher(userName);
    return m.matches();
  }
}
