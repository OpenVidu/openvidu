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
 *
 */

package io.openvidu.test.e2e.utils;

import java.util.Collections;
import java.util.Map;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.LinkedBlockingDeque;
import java.util.concurrent.TimeUnit;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.event.EventListener;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

@SpringBootApplication
public class CustomWebhook {

	private static ConfigurableApplicationContext context;

	public static CountDownLatch initLatch;
	private static Map<String, BlockingQueue<JsonObject>> events = new ConcurrentHashMap<>();
	private static JsonParser jsonParser = new JsonParser();

	public static void main(String[] args, CountDownLatch initLatch) {
		CustomWebhook.initLatch = initLatch;
		SpringApplication app = new SpringApplication(CustomWebhook.class);
		app.setDefaultProperties(Collections.singletonMap("server.port", "7777"));
		CustomWebhook.context = app.run(args);
	}

	public static void shutDown() {
		CustomWebhook.context.close();
	}

	public static JsonObject waitForEvent(String eventName, int maxSecondsWait) throws Exception {
		if (events.get(eventName) == null) {
			events.put(eventName, new LinkedBlockingDeque<>());
		}
		JsonObject event = CustomWebhook.events.get(eventName).poll(maxSecondsWait, TimeUnit.SECONDS);
		if (event == null) {
			throw new Exception("Timeout waiting for Webhook " + eventName);
		} else {
			return event;
		}
	}

	@RestController
	public class GreetingController {
		@RequestMapping("/webhook")
		public void greeting(@RequestBody String eventString) {
			JsonObject event = (JsonObject) jsonParser.parse(eventString);
			final String eventName = event.get("event").getAsString();
			System.out.println(event.toString());
			if (events.get(eventName) == null) {
				events.put(eventName, new LinkedBlockingDeque<>());
			}
			CustomWebhook.events.get(eventName).add(event);
		}
	}

	@EventListener(ApplicationReadyEvent.class)
	public void doSomethingAfterStartup() {
		CustomWebhook.initLatch.countDown();
	}

}
