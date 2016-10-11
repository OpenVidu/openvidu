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

package org.openvidu.server.core.api;

import org.openvidu.client.OpenViduException;
import org.openvidu.server.core.api.pojo.ParticipantRequest;
import org.openvidu.server.core.internal.DefaultNotificationRoomHandler;

/**
 * This specification was designed so that the room manager could send notifications or responses
 * back to the remote peers whilst remaining isolated from the transport or communications layers.
 * The notification API will be used by the default implementation of
 * {@link NotificationRoomHandler} (provided by the room SDK -
 * {@link DefaultNotificationRoomHandler}).
 * <p/>
 * JSON-RPC messages specification was used to define the following primitives.It is expected but
 * not required for the client-server communications to use this protocol. It is left for the
 * integrator to provide an implementation for this API. If the developer chooses another mechanism
 * to communicate with the client, they will have to use their own implementation of
 * NotificationRoomHandler which will completly decouple the communication details from the room
 * API.
 *
 * @author <a href="mailto:rvlad@naevatec.com">Radu Tom Vlad</a>
 */
public interface UserNotificationService {

  /**
   * Responds back to the remote peer with the result of the invoked method.
   *
   * @param participantRequest
   *          instance of {@link ParticipantRequest} POJO
   * @param result
   *          Object containing information that depends on the invoked method. It'd normally be a
   *          JSON element-type object.
   */
  void sendResponse(ParticipantRequest participantRequest, Object result);

  /**
   * Responds back to the remote peer with the details of why the invoked method failed to be
   * processed correctly.
   *
   * @param participantRequest
   *          instance of {@link ParticipantRequest} POJO
   * @param data
   *          optional (nullable) Object containing additional information on the error. Can be a
   *          String or a JSON element-type object.
   * @param error
   *          instance of {@link OpenViduException} POJO, includes a code and error message
   */
  void sendErrorResponse(ParticipantRequest participantRequest, Object data, OpenViduException error);

  /**
   * Sends a notification to a remote peer. This falls outside the normal exchange of messages
   * (client requests - server answers) so there's no need for a request identifier.
   *
   * @param participantId
   *          identifier of the targeted participant
   * @param method
   *          String with the name of the method or event to be invoked on the client
   * @param params
   *          Object containing information that depends on the invoked method. It'd normally be a
   *          JSON element-type object.
   */
  void sendNotification(String participantId, String method, Object params);

  /**
   * Notifies that any information associated with the provided request should be cleaned up (the
   * participant has left).
   *
   * @param participantRequest
   *          instance of {@link ParticipantRequest} POJO
   */
  void closeSession(ParticipantRequest participantRequest);
}
