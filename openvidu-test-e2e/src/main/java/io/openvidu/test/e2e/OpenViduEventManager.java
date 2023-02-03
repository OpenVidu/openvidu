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

package io.openvidu.test.e2e;

import static org.openqa.selenium.OutputType.BASE64;

import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Queue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Consumer;

import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.TakesScreenshot;
import org.openqa.selenium.WebDriver;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

/**
 * Manager event class for BrowserUser. Collects, cleans and stores events from
 * openvidu-testapp
 *
 * @author Pablo Fuente (pablofuenteperez@gmail.com)
 * @since 1.1.1
 */
public class OpenViduEventManager {

	private static final Logger log = LoggerFactory.getLogger(OpenViduEventManager.class);

	private static class RunnableCallback implements Runnable {

		private final Consumer<JsonObject> callback;
		private JsonObject eventResult;

		public RunnableCallback(Consumer<JsonObject> callback, JsonObject eventResult) {
			this.callback = callback;
			this.eventResult = eventResult;
		}

		@Override
		public void run() {
			callback.accept(this.eventResult);
		}
	}

	private Thread pollingThread;
	private ExecutorService execService = Executors.newCachedThreadPool();
	private WebDriver driver;
	private Queue<JsonObject> eventQueue;

	private Map<String, Collection<Consumer<JsonObject>>> eventCallbacks;
	private Map<String, AtomicInteger> eventNumbers;
	private Map<String, CountDownLatch> eventCountdowns;

	private Map<Integer, Map<String, Collection<Consumer<JsonObject>>>> eventCallbacksByUser;
	private Map<Integer, Map<String, AtomicInteger>> eventNumbersByUser;
	private Map<Integer, Map<String, CountDownLatch>> eventCountdownsByUser;

	private AtomicBoolean isInterrupted = new AtomicBoolean(false);
	private CountDownLatch pollingLatch = new CountDownLatch(1);
	private int timeOfWaitInSeconds;

	public OpenViduEventManager(WebDriver driver, int timeOfWaitInSeconds) {
		this.driver = driver;
		this.eventQueue = new ConcurrentLinkedQueue<JsonObject>();
		this.eventCallbacks = new ConcurrentHashMap<>();
		this.eventNumbers = new ConcurrentHashMap<>();
		this.eventCountdowns = new ConcurrentHashMap<>();
		this.eventCallbacksByUser = new ConcurrentHashMap<>();
		this.eventNumbersByUser = new ConcurrentHashMap<>();
		this.eventCountdownsByUser = new ConcurrentHashMap<>();
		this.timeOfWaitInSeconds = timeOfWaitInSeconds;
	}

	public void startPolling() {

		Thread.UncaughtExceptionHandler h = new Thread.UncaughtExceptionHandler() {
			public void uncaughtException(Thread th, Throwable ex) {
				if (ex.getClass().getSimpleName().equals("UnhandledAlertException")) {
					stopPolling(true, false);
					System.err
							.println("Alert opened (" + ex.getMessage() + "). Waiting 1 second and restarting polling");
					try {
						Thread.sleep(1000);
					} catch (InterruptedException e) {
						e.printStackTrace();
					}
					startPolling();
				}
				if (ex.getClass().getSimpleName().equals("NoSuchSessionException")) {
					System.err.println("Disposing driver when running 'executeScript'");
				}
			}
		};

		if (this.pollingThread != null) {
			this.pollingThread.interrupt();
		}

		this.pollingThread = new Thread(() -> {
			while (!this.isInterrupted.get()) {
				this.getEventsFromBrowser();
				this.emitEvents();
				try {
					Thread.sleep(25);
				} catch (InterruptedException e) {
				}
			}
			log.info("Polling thread is now interrupted!");
			this.pollingLatch.countDown();
		});
		this.pollingThread.setUncaughtExceptionHandler(h);
		this.pollingThread.start();
	}

	public void stopPolling(boolean stopThread, boolean cleanExistingEvents) {
		if (stopThread) {
			this.isInterrupted.set(true);
			this.pollingThread.interrupt();
		}
		if (cleanExistingEvents) {
			this.eventCallbacks.clear();
			this.eventCountdowns.clear();
			this.eventNumbers.clear();
			this.eventCallbacksByUser.clear();
			this.eventCountdownsByUser.clear();
			this.eventNumbersByUser.clear();
		}
	}

	public void on(String eventName, Consumer<JsonObject> callback) {
		this.eventCallbacks.putIfAbsent(eventName, new HashSet<>());
		this.eventCallbacks.get(eventName).add(callback);
	}

	public void on(int numberOfUser, String eventName, Consumer<JsonObject> callback) {
		this.eventCallbacksByUser.putIfAbsent(numberOfUser, new HashMap<>());
		this.eventCallbacksByUser.get(numberOfUser).putIfAbsent(eventName, new HashSet<>());
		this.eventCallbacksByUser.get(numberOfUser).get(eventName).add(callback);
	}

	public void off(String eventName) {
		this.eventCallbacks.remove(eventName);
	}

	public void off(int numberOfUser, String eventName) {
		if (this.eventCallbacksByUser.containsKey(numberOfUser)) {
			this.eventCallbacksByUser.get(numberOfUser).remove(eventName);
			if (this.eventCallbacksByUser.get(numberOfUser).isEmpty()) {
				this.eventCallbacksByUser.remove(numberOfUser);
			}
		}
	}

	// 'eventNumber' is accumulative for event 'eventName' for one page while it is
	// not refreshed
	public void waitUntilEventReaches(String eventName, int eventNumber) throws Exception {
		this.waitUntilEventReaches(eventName, eventNumber, this.timeOfWaitInSeconds, true);
	}

	public void waitUntilEventReaches(String eventName, int eventNumber, int secondsOfWait, boolean printTimeoutError)
			throws Exception {
		CountDownLatch eventSignal = new CountDownLatch(eventNumber);
		this.setCountDown(eventName, eventSignal);
		try {
			if (!eventSignal.await(secondsOfWait * 1000, TimeUnit.MILLISECONDS)) {
				if (printTimeoutError) {
					String screenshot = "data:image/png;base64," + ((TakesScreenshot) driver).getScreenshotAs(BASE64);
					System.out.println("TIMEOUT SCREENSHOT");
					System.out.println(screenshot);
				}
				throw (new TimeoutException());
			}
		} catch (InterruptedException | TimeoutException e) {
			if (printTimeoutError) {
				e.printStackTrace();
			}
			throw e;
		}
	}

	public void waitUntilEventReaches(int numberOfUser, String eventName, int eventNumber) throws Exception {
		this.waitUntilEventReaches(numberOfUser, eventName, eventNumber, this.timeOfWaitInSeconds, true);
	}

	public void waitUntilEventReaches(int numberOfUser, String eventName, int eventNumber, int secondsOfWait,
			boolean printTimeoutError) throws Exception {
		CountDownLatch eventSignal = new CountDownLatch(eventNumber);
		this.setCountDown(numberOfUser, eventName, eventSignal);
		try {
			if (!eventSignal.await(secondsOfWait * 1000, TimeUnit.MILLISECONDS)) {
				if (printTimeoutError) {
					String screenshot = "data:image/png;base64," + ((TakesScreenshot) driver).getScreenshotAs(BASE64);
					System.out.println("TIMEOUT SCREENSHOT");
					System.out.println(screenshot);
				}
				throw (new TimeoutException());
			}
		} catch (InterruptedException | TimeoutException e) {
			if (printTimeoutError) {
				e.printStackTrace();
			}
			throw e;
		}
	}

	// Sets any event count to 0
	public synchronized void clearCurrentEvents(String eventName) {
		this.eventNumbers.put(eventName, new AtomicInteger(0));
		this.setCountDown(eventName, new CountDownLatch(0));
	}

	public synchronized void clearCurrentEvents(int numberOfUser, String eventName) {
		if (this.eventNumbersByUser.containsKey(numberOfUser)) {
			this.eventNumbersByUser.get(numberOfUser).put(eventName, new AtomicInteger(0));
			this.setCountDown(numberOfUser, eventName, new CountDownLatch(0));
		}
	}

	public synchronized void clearAllCurrentEvents() {
		this.eventNumbers.keySet().forEach(eventName -> {
			this.clearCurrentEvents(eventName);
		});
	}

	public synchronized void clearAllCurrentEvents(int numberOfUser) {
		if (this.eventNumbersByUser.containsKey(numberOfUser)) {
			this.eventNumbersByUser.get(numberOfUser).keySet().forEach(eventName -> {
				this.clearCurrentEvents(numberOfUser, eventName);
			});
		}
	}

	public void resetEventThread(boolean clearData) throws InterruptedException {
		this.stopPolling(true, clearData);
		this.pollingLatch.await();
		this.execService.shutdownNow();
		this.execService.awaitTermination(10, TimeUnit.SECONDS);
		this.execService = Executors.newCachedThreadPool();
		this.stopPolling(false, clearData);
		if (clearData) {
			this.clearAllCurrentEvents();
			this.eventNumbersByUser.keySet().forEach(user -> this.clearAllCurrentEvents(user));
		}
		this.isInterrupted.set(false);
		this.pollingLatch = new CountDownLatch(1);
		if (clearData) {
			this.eventQueue.clear();
		}
		this.startPolling();
	}

	public AtomicInteger getNumEvents(String eventName) {
		return this.eventNumbers.computeIfAbsent(eventName, k -> new AtomicInteger(0));
	}

	public AtomicInteger getNumEvents(int numberOfUser, String eventName) {
		this.eventNumbersByUser.putIfAbsent(numberOfUser, new HashMap<>());
		return this.eventNumbersByUser.get(numberOfUser).computeIfAbsent(eventName, k -> new AtomicInteger(0));
	}

	private void setCountDown(String eventName, CountDownLatch cd) {
		this.eventCountdowns.put(eventName, cd);
		for (int i = 0; i < getNumEvents(eventName).get(); i++) {
			cd.countDown();
		}
	}

	private void setCountDown(int numberOfUser, String eventName, CountDownLatch cd) {
		this.eventCountdownsByUser.putIfAbsent(numberOfUser, new HashMap<>());
		this.eventCountdownsByUser.get(numberOfUser).put(eventName, cd);
		for (int i = 0; i < getNumEvents(numberOfUser, eventName).get(); i++) {
			cd.countDown();
		}
	}

	private void emitEvents() {
		while (!this.eventQueue.isEmpty()) {
			JsonObject userAndEvent = this.eventQueue.poll();
			final JsonObject event = userAndEvent.get("event").getAsJsonObject();
			final int numberOfUser = userAndEvent.get("user").getAsInt();
			final String eventType = event.get("type").getAsString();

			log.info(eventType);

			if (this.eventCallbacks.containsKey(eventType)) {
				for (Consumer<JsonObject> callback : this.eventCallbacks.get(eventType)) {
					final RunnableCallback runnableCallback = new RunnableCallback(callback, event);
					execService.submit(runnableCallback);
				}
			}
			if (this.eventCallbacksByUser.containsKey(numberOfUser)) {
				for (Consumer<JsonObject> callback : this.eventCallbacksByUser.get(numberOfUser).get(eventType)) {
					final RunnableCallback runnableCallback = new RunnableCallback(callback, event);
					execService.submit(runnableCallback);
				}
			}
		}
	}

	private synchronized void getEventsFromBrowser() {
		String rawEvents = this.getAndClearEventsInBrowser();

		if (rawEvents == null || rawEvents.length() == 0) {
			return;
		}

		String[] events = rawEvents.replaceFirst("^<br>", "").split("<br>");
		for (String e : events) {
			JsonObject userAndEvent = JsonParser.parseString(e).getAsJsonObject();
			final JsonObject event = userAndEvent.get("event").getAsJsonObject();
			final int numberOfUser = userAndEvent.get("user").getAsInt();
			final String eventType = event.get("type").getAsString();

			this.eventQueue.add(userAndEvent);

			getNumEvents(eventType).incrementAndGet();
			if (this.eventCountdowns.get(eventType) != null) {
				this.eventCountdowns.get(eventType).countDown();
			}

			getNumEvents(numberOfUser, eventType).incrementAndGet();
			this.eventCountdownsByUser.putIfAbsent(numberOfUser, new HashMap<>());
			if (this.eventCountdownsByUser.get(numberOfUser).get(eventType) != null) {
				this.eventCountdownsByUser.get(numberOfUser).get(eventType).countDown();
			}
		}
	}

	private synchronized String getAndClearEventsInBrowser() {
		String events = (String) ((JavascriptExecutor) driver)
				.executeScript("var e = window.myEvents; window.myEvents = ''; return e;");
		return events;
	}
}
