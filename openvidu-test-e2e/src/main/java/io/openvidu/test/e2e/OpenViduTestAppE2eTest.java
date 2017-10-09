package io.openvidu.test.e2e;
/*
 * (C) Copyright 2017-2019 OpenVideo (http://openvidu.io/)
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

import static java.lang.invoke.MethodHandles.lookup;
import static org.slf4j.LoggerFactory.getLogger;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.runner.RunWith;
import org.junit.platform.runner.JUnitPlatform;
import org.openqa.selenium.By;
import org.slf4j.Logger;

import io.github.bonigarcia.SeleniumExtension;
import io.openvidu.test.e2e.browser.ChromeUser;
import io.openvidu.test.e2e.browser.FirefoxUser;


/**
 * E2E test for openvidu-testapp.
 *
 * @author Pablo Fuente (pablo.fuente@urjc.es)
 * @since 1.1.1
 */
@Tag("e2e")
@DisplayName("E2E tests for OpenVidu TestApp")
@ExtendWith(SeleniumExtension.class)
@RunWith(JUnitPlatform.class)
public class OpenViduTestAppE2eTest {

	final Logger log = getLogger(lookup().lookupClass());

	final String DEFAULT_SESSION_NAME = "TestSession";

	String testAppUrl = "http://localhost:4200/"; // default value (local)

	@BeforeEach
	void setup() {
		
	}

	@Test
	@DisplayName("One2One [Video + Audio] session")
	void oneToOneVideoAudioSession() throws InterruptedException {

		FirefoxUser user = new FirefoxUser("TestUser", 10);
		user.getEventManager().startPolling();

		log.debug("Navigate to openvidu-testapp and click on 1:1 scenario");

		user.getDriver().get(testAppUrl);
		user.getDriver().findElement(By.id("auto-join-checkbox")).click();
		user.getDriver().findElement(By.id("one2one-btn")).click();

		user.getEventManager().waitUntilNumberOfEvent("videoPlaying", 4);

		user.getDriver().findElement(By.id("remove-user-btn")).click();
		
		user.getEventManager().waitUntilNumberOfEvent("streamDestroyed", 1);
		user.getEventManager().waitUntilNumberOfEvent("sessionDisconnected", 1);
		
		user.getDriver().findElement(By.id("remove-user-btn")).click();
		
		user.getEventManager().waitUntilNumberOfEvent("sessionDisconnected", 2);
		
		user.dispose();
	}
	
	@Test
	@DisplayName("One2Many [Video + Audio] session")
	void oneToManyVideoAudioSession() throws InterruptedException {

		ChromeUser user = new ChromeUser("TestUser", 10);
		user.getEventManager().startPolling();

		log.debug("Navigate to openvidu-testapp and click on 1:N scenario");

		user.getDriver().get(testAppUrl);
		user.getDriver().findElement(By.id("auto-join-checkbox")).click();
		user.getDriver().findElement(By.id("one2many-btn")).click();

		user.getEventManager().waitUntilNumberOfEvent("videoPlaying", 4);
		
		user.getDriver().findElements(By.className(("leave-btn"))).get(0).click();
		
		user.getEventManager().waitUntilNumberOfEvent("streamDestroyed", 3);
		
		user.dispose();
	}
	
	@Test
	@DisplayName("Unique user remote subscription [Video + Audio]")
	void oneRemoteSubscription() throws InterruptedException {

		ChromeUser user = new ChromeUser("TestUser", 10);
		user.getEventManager().startPolling();

		log.debug("Navigate to openvidu-testapp and join one user with remote subscription");

		user.getDriver().get(testAppUrl);
		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.className("subscribe-remote-check")).click();
		user.getDriver().findElement(By.id("join-btn")).click();
		
		user.getEventManager().waitUntilNumberOfEvent("connectionCreated", 1);
		user.getEventManager().waitUntilNumberOfEvent("accessAllowed", 1);
		user.getEventManager().waitUntilNumberOfEvent("videoElementCreated", 1);
		user.getEventManager().waitUntilNumberOfEvent("remoteVideoPlaying", 1);
		
		user.getDriver().findElement(By.className(("leave-btn"))).click();
		
		user.getEventManager().waitUntilNumberOfEvent("sessionDisconnected", 1);
		
		user.dispose();
	}
	
	@Test
	@DisplayName("Unique user remote subscription [ScreenShare + Audio]")
	void oneRemoteSubscriptionScreen() throws InterruptedException {

		ChromeUser user = new ChromeUser("TestUser", 10);
		user.getEventManager().startPolling();

		log.debug("Navigate to openvidu-testapp and join one user with remote subscription");

		user.getDriver().get(testAppUrl);
		user.getDriver().findElement(By.id("add-user-btn")).click();
		user.getDriver().findElement(By.className("screen-radio")).click();
		user.getDriver().findElement(By.className("subscribe-remote-check")).click();
		user.getDriver().findElement(By.id("join-btn")).click();
		
		user.getEventManager().waitUntilNumberOfEvent("connectionCreated", 1);
		user.getEventManager().waitUntilNumberOfEvent("accessAllowed", 1);
		user.getEventManager().waitUntilNumberOfEvent("videoElementCreated", 1);
		user.getEventManager().waitUntilNumberOfEvent("remoteVideoPlaying", 1);
		
		user.getDriver().findElement(By.className(("leave-btn"))).click();
		
		user.getEventManager().waitUntilNumberOfEvent("sessionDisconnected", 1);
		
		user.dispose();
	}

}
