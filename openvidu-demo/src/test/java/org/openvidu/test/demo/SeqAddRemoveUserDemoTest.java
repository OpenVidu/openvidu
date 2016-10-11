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

package org.openvidu.test.demo;

import java.lang.invoke.MethodHandles;
import java.util.Collection;

import org.junit.runners.Parameterized.Parameters;
import org.kurento.test.browser.WebPageType;
import org.openvidu.test.browser.SeqAddRemoveUser;

/**
 * @see SeqAddRemoveUser
 * @author Radu Tom Vlad (rvlad@naevatec.com)
 */
public class SeqAddRemoveUserDemoTest extends SeqAddRemoveUser {

  @Override
  public void setupBrowserTest() throws InterruptedException {
    webPageType = WebPageType.ROOT;
    super.setupBrowserTest();
  }

  @Parameters(name = "{index}: {0}")
  public static Collection<Object[]> data() {
    return localChromes(MethodHandles.lookup().lookupClass().getSimpleName(), NUM_USERS,
        WebPageType.ROOT);
  }

}
