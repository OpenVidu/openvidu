/*
 * (C) Copyright 2016 Kurento (http://kurento.org/)
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
package org.openvidu.client.test;

import static org.hamcrest.CoreMatchers.is;
import static org.junit.Assert.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.openvidu.client.internal.ProtocolElements.*;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.junit.Before;
import org.junit.Test;
import org.kurento.jsonrpc.client.JsonRpcClient;
import org.openvidu.client.OpenViduClient;
import org.openvidu.client.ServerJsonRpcHandler;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;

/**
 * Unit tests for the room client protocol.
 *
 * @author Radu Tom Vlad (rvlad@naevatec.com)
 * @since 6.3.1
 */
public class OpenViduClientTest {

  private OpenViduClient client;
  private ServerJsonRpcHandler serverHandler;
  private JsonRpcClient jsonRpcClient;

  @Before
  public void setup() {
    jsonRpcClient = mock(JsonRpcClient.class);
    serverHandler = new ServerJsonRpcHandler();
    client = new OpenViduClient(jsonRpcClient, serverHandler);
  }

  @Test
  public void testRoomJoin() throws IOException {
    JsonObject params = new JsonObject();
    params.addProperty(JOINROOM_ROOM_PARAM, "room");
    params.addProperty(JOINROOM_USER_PARAM, "user");

    JsonObject result = new JsonObject();
    JsonArray value = new JsonArray();
    result.add("value", value);

    Map<String, List<String>> joinResult = new HashMap<String, List<String>>();

    when(jsonRpcClient.sendRequest(JOINROOM_METHOD, params)).thenReturn(result);
    assertThat(client.joinRoom("room", "user", null), is(joinResult));

  }
}
