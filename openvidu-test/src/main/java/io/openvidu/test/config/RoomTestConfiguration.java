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
 */
package io.openvidu.test.config;

import static org.kurento.test.config.TestConfiguration.KMS_WS_URI_DEFAULT;
import static org.kurento.test.config.TestConfiguration.KMS_WS_URI_PROP;

/**
 * Kurento Room test properties.
 *
 * @author Radu Tom Vlad (rvlad@naevatec.com)
 * @since 6.2.1
 */
public class RoomTestConfiguration {

  public static final String ROOM_APP_CLASSNAME_PROP = "room.app.classnames";
  public static final String ROOM_APP_CLASSNAME_DEFAULT = "[org.kurento.room.basic.KurentoRoomBasicApp,"
      + "org.kurento.room.demo.KurentoRoomDemoApp]";

  public static final String EXTRA_KMS_WS_URI_PROP = KMS_WS_URI_PROP + ".extra";
  public static final String EXTRA_KMS_WS_URI_DEFAULT = KMS_WS_URI_DEFAULT;

  public static final String ROOM_PREFIX = "room";
  public static final String USER_BROWSER_PREFIX = "browser";
  public static final String USER_FAKE_PREFIX = "user";
  public static final String DEFAULT_ROOM = ROOM_PREFIX;

  public final static int DEFAULT_ROOM_INOUT_AWAIT_TIME_IN_SECONDS = 60;
  public final static int DEFAULT_ACTIVE_LIVE_TOTAL_TIMEOUT_IN_SECONDS = 60;
  public final static int DEFAULT_PLAY_TIME_IN_SECONDS = 30;
  public static final int TASKS_TIMEOUT_IN_MINUTES = 15;
}
