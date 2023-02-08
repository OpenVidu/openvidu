/*
 * (C) Copyright 2017-2022 OpenVidu (https://openvidu.io)
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

package io.openvidu.test.browsers.utils.webhook;

import java.util.Iterator;
import java.util.LinkedList;
import java.util.List;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.LinkedBlockingDeque;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.event.EventListener;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityConfigurerAdapter;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

@SpringBootApplication
public class CustomWebhook {

	private static ConfigurableApplicationContext context;

	public static CountDownLatch initLatch;
	public static int accumulatedNumberOfEvents = 0;
	public final static ConcurrentMap<String, List<JsonObject>> accumulatedEvents = new ConcurrentHashMap<>();
	public static final ConcurrentMap<String, BlockingQueue<JsonObject>> events = new ConcurrentHashMap<>();
	static final BlockingQueue<JsonObject> eventsInOrder = new LinkedBlockingDeque<>();

	public static void main(String[] args, CountDownLatch initLatch) {
		CustomWebhook.initLatch = initLatch;
		CustomWebhook.clean();
		CustomWebhook.context = new SpringApplicationBuilder(CustomWebhook.class)
				.properties("spring.config.location:classpath:aplication-pro-webhook.properties").build().run(args);
	}

	public static void shutDown() {
		CustomWebhook.clean();
		CustomWebhook.context.close();
	}

	public static void clean() {
		CustomWebhook.accumulatedNumberOfEvents = 0;
		CustomWebhook.accumulatedEvents.clear();
		CustomWebhook.eventsInOrder.clear();
		CustomWebhook.events.clear();
	}

	public static void cleanEventsInOrder() {
		CustomWebhook.eventsInOrder.clear();
	}

	public synchronized static JsonObject waitForEvent(String eventName, int maxSecondsWait) throws Exception {
		return CustomWebhook.waitForEvent(eventName, maxSecondsWait, TimeUnit.SECONDS);
	}

	public synchronized static JsonObject waitForEvent(String eventName, int maxWait, TimeUnit timeUnit)
			throws Exception {
		if (events.get(eventName) == null) {
			events.put(eventName, new LinkedBlockingDeque<>());
		}
		JsonObject event = CustomWebhook.events.get(eventName).poll(maxWait, timeUnit);
		if (event == null) {
			throw new TimeoutException("Timeout waiting for Webhook " + eventName);
		} else {
			return event;
		}
	}

	public synchronized static JsonObject waitForNextEventToBeOfType(String eventName, int maxSecondsWait)
			throws Exception {
		JsonObject event = eventsInOrder.poll(maxSecondsWait, TimeUnit.SECONDS);
		if (event == null) {
			throw new TimeoutException("Timeout waiting for Webhook " + eventName);
		} else {
			String ev = event.get("event").getAsString();
			if (!eventName.equals(ev)) {
				throw new Exception("Wrong event type receieved. Excpeceted " + eventName + " but got " + ev + ": "
						+ event.toString());
			} else {
				// Remove the very same event from the map of events
				long maxWait = System.currentTimeMillis();
				do {
					Thread.sleep(25);
				} while (!CustomWebhook.events.containsKey(eventName)
						|| (System.currentTimeMillis() - maxWait) < (maxSecondsWait * 1000));
				if (!CustomWebhook.events.get(eventName).contains(event)) {
					throw new Exception("Lack of event " + eventName);
				} else {
					JsonObject sameEvent = null;
					Iterator<JsonObject> it = CustomWebhook.events.get(eventName).iterator();
					boolean found = false;
					while (!found && it.hasNext()) {
						JsonObject json = it.next();
						if (json.equals(event)) {
							found = true;
							sameEvent = json;
							it.remove();
						}
					}
					if (!event.equals(sameEvent)) {
						throw new Exception(
								"Events were different! " + event.toString() + " | " + sameEvent.toString());
					}
					return event;
				}
			}
		}
	}

	public synchronized static JsonObject waitToNotReceiveEvent(String eventName, int secondsForNotReceiving)
			throws Exception {
		if (events.get(eventName) == null) {
			events.put(eventName, new LinkedBlockingDeque<>());
		}
		JsonObject event = CustomWebhook.events.get(eventName).poll(secondsForNotReceiving, TimeUnit.SECONDS);
		if (event != null) {
			throw new Exception("WebHook received event " + eventName + " and it wasn't expected: " + event.toString());
		} else {
			return event;
		}
	}

	@RestController
	public class WebhookController {
		@RequestMapping("/webhook")
		public void webhook(@RequestBody String eventString) {
			JsonObject event = JsonParser.parseString(eventString).getAsJsonObject();
			System.out.println("Webhook event: " + event.toString());
			accumulatedNumberOfEvents++;
			eventsInOrder.add(event);
			final String eventName = event.get("event").getAsString();
			accumulatedEvents.putIfAbsent(eventName, new LinkedList<>());
			accumulatedEvents.get(eventName).add(event);
			final BlockingQueue<JsonObject> queue = new LinkedBlockingDeque<>();
			if (!CustomWebhook.events.computeIfAbsent(eventName, e -> {
				queue.add(event);
				return queue;
			}).equals(queue)) {
				CustomWebhook.events.get(eventName).add(event);
			}
		}
	}

	@EventListener(ApplicationReadyEvent.class)
	public void doSomethingAfterStartup() {
		CustomWebhook.initLatch.countDown();
	}

	@Configuration
	public class SecurityConfig extends WebSecurityConfigurerAdapter {
		@Override
		protected void configure(HttpSecurity http) throws Exception {
			http.requiresChannel().antMatchers("/webhook").requiresInsecure();
			http.csrf().disable().authorizeRequests().antMatchers("/webhook").permitAll();
		}
	}

}
