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
package io.openvidu.test;

import org.junit.experimental.categories.Category;
import org.kurento.commons.testing.SystemFunctionalTests;
import org.kurento.test.browser.WebPage;

/**
 * Functional Kurento Room tests (using browser clients).
 *
 * @author Radu Tom Vlad (rvlad@naevatec.com)
 * @since 6.2.1
 */
@Category(SystemFunctionalTests.class)
public class RoomFunctionalBrowserTest<W extends WebPage> extends OpenViduClientBrowserTest<W> {
}
