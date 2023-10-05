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

package io.openvidu.test.browsers;

import java.awt.Point;
import java.time.Duration;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

import org.openqa.selenium.Dimension;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedCondition;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.slf4j.LoggerFactory;

public class BrowserUser {

	protected static final org.slf4j.Logger log = LoggerFactory.getLogger(BrowserUser.class);

	protected WebDriver driver;
	protected WebDriverWait waiter;
	protected String clientData;
	protected int timeOfWaitInSeconds;

	public BrowserUser(String clientData, int timeOfWaitInSeconds) {
		this.clientData = clientData;
		this.timeOfWaitInSeconds = timeOfWaitInSeconds;
	}

	public WebDriver getDriver() {
		return this.driver;
	}

	public WebDriverWait getWaiter() {
		return this.waiter;
	}

	public String getClientData() {
		return this.clientData;
	}

	public int getTimeOfWait() {
		return this.timeOfWaitInSeconds;
	}

	protected void newWaiter(int timeOfWait) {
		this.waiter = new WebDriverWait(this.driver, Duration.ofSeconds(timeOfWait));
	}

	protected void configureDriver() {
		this.waiter = new WebDriverWait(this.driver, Duration.ofSeconds(timeOfWaitInSeconds));
	}

	protected void configureDriver(Dimension windowDimensions) {
		this.configureDriver();
		if (windowDimensions != null) {
			this.driver.manage().window().setSize(windowDimensions);
		}
	}

	public void waitWithNewTime(int newWaitTime, ExpectedCondition<?> condition) {
		this.waiter.withTimeout(Duration.of(newWaitTime, ChronoUnit.SECONDS));
		this.waiter.until(condition);
		this.waiter.withTimeout(Duration.of(this.getTimeOfWait(), ChronoUnit.SECONDS));
	}

	public void dispose() {
		this.driver.quit();
	}

	public boolean hasMediaStream(WebElement videoElement, String parentSelector) {
		boolean hasMediaStream = (boolean) ((JavascriptExecutor) driver).executeScript(
				"return (!!(document.querySelector('" + parentSelector + (parentSelector.isEmpty() ? "" : " ") + "#"
						+ videoElement.getAttribute("id") + "').srcObject))");
		return hasMediaStream;
	}

	public Map<String, Long> getAverageRgbFromVideo(WebElement videoElement) {
		String script = "var callback = arguments[arguments.length - 1];" + "var video = document.getElementById('"
				+ videoElement.getAttribute("id") + "');" + "var canvas = document.createElement('canvas');"
				+ "canvas.height = video.videoHeight;" + "canvas.width = video.videoWidth;"
				+ "var context = canvas.getContext('2d');"
				+ "context.drawImage(video, 0, 0, canvas.width, canvas.height);"
				+ "var imgEl = document.createElement('img');" + "imgEl.src = canvas.toDataURL();"
				+ "var blockSize = 5;" + "var defaultRGB = { r: 0, g: 0, b: 0 };"
				+ "context.drawImage(video, 0, 0, 220, 150);" + "var dataURL = canvas.toDataURL();"
				+ "imgEl.onload = function () {" + "let i = -4;" + "var rgb = { r: 0, g: 0, b: 0 };" + "let count = 0;"
				+ "if (!context) {" + "  return defaultRGB;" + "}"
				+ "var height = canvas.height = imgEl.naturalHeight || imgEl.offsetHeight || imgEl.height;"
				+ "var width = canvas.width = imgEl.naturalWidth || imgEl.offsetWidth || imgEl.width;" + "let data;"
				+ "context.drawImage(imgEl, 0, 0);" + "try {" + "data = context.getImageData(0, 0, width, height);"
				+ "} catch (e) {" + "return defaultRGB;" + "}" + "length = data.data.length;"
				+ "while ((i += blockSize * 4) < length) {" + "++count;" + "rgb.r += data.data[i];"
				+ "rgb.g += data.data[i + 1];" + "rgb.b += data.data[i + 2];" + "}" + "rgb.r = ~~(rgb.r / count);"
				+ "rgb.g = ~~(rgb.g / count);" + "rgb.b = ~~(rgb.b / count);" + "callback(rgb);" + "};";
		Object averageRgb = ((JavascriptExecutor) driver).executeAsyncScript(script);
		return (Map<String, Long>) averageRgb;
	}

	public Map<String, Long> getAverageColorFromPixels(WebElement videoElement, List<Point> pixelPercentagePositions) {
		String script = "var callback = arguments[arguments.length - 1];"
				+ "var points = arguments[arguments.length - 2];" + "points = JSON.parse(points);"
				+ "var video = document.getElementById('local-video-undefined');"
				+ "var canvas = document.createElement('canvas');" + "canvas.height = video.videoHeight;"
				+ "canvas.width = video.videoWidth;" + "var context = canvas.getContext('2d');"
				+ "context.drawImage(video, 0, 0, canvas.width, canvas.height);"
				+ "var imgEl = document.createElement('img');" + "imgEl.src = canvas.toDataURL();"
				+ "var blockSize = 5;" + "var defaultRGB = {r:0,g:0,b:0};" + "context.drawImage(video, 0, 0, 220, 150);"
				+ "var dataURL = canvas.toDataURL();" + "imgEl.onload = function() {" + "    var rgb = {r:0,g:0,b:0};"
				+ "    if (!context) {" + "        return defaultRGB;" + "    }"
				+ "    var height = canvas.height = imgEl.naturalHeight || imgEl.offsetHeight || imgEl.height;"
				+ "    var width = canvas.width = imgEl.naturalWidth || imgEl.offsetWidth || imgEl.width;"
				+ "    let data;" + "    context.drawImage(imgEl, 0, 0);" + "    for (var p of points) {"
				+ "        var xFromPercentage = width * (p.x / 100);"
				+ "        var yFromPercentage = height * (p.y / 100);"
				+ "        data = context.getImageData(xFromPercentage, yFromPercentage, 1, 1).data;"
				+ "        rgb.r += data[0];" + "        rgb.g += data[1];" + "        rgb.b += data[2];" + "    }"
				+ "    rgb.r = ~~(rgb.r / points.length);" + "    rgb.g = ~~(rgb.g / points.length);"
				+ "    rgb.b = ~~(rgb.b / points.length);" + "    callback(rgb);" + "};";
		String points = "[";
		Iterator<Point> it = pixelPercentagePositions.iterator();
		while (it.hasNext()) {
			Point p = it.next();
			points += "{\"x\":" + p.getX() + ",\"y\":" + p.getY() + "}";
			if (it.hasNext()) {
				points += ",";
			}
		}
		points += "]";
		Object averageRgb = ((JavascriptExecutor) driver).executeAsyncScript(script, points);
		return (Map<String, Long>) averageRgb;
	}

	public String getDimensionOfViewport() {
		String dimension = (String) ((JavascriptExecutor) driver)
				.executeScript("return (JSON.stringify({width: window.innerWidth, height: window.innerHeight - 1}))");
		return dimension;
	}

	public void stopVideoTracksOfVideoElement(WebElement videoElement, String parentSelector) {
		String script = "return (document.querySelector('" + parentSelector + (parentSelector.isEmpty() ? "" : " ")
				+ "#" + videoElement.getAttribute("id")
				+ "').srcObject.getVideoTracks().forEach(track => track.stop()))";
		((JavascriptExecutor) driver).executeScript(script);
	}

	public boolean assertMediaTracks(WebElement videoElement, boolean audioTransmission, boolean videoTransmission,
			String parentSelector) {
		return this.assertMediaTracks(Collections.singleton(videoElement), audioTransmission, videoTransmission,
				parentSelector);
	}

	public boolean assertMediaTracks(Iterable<WebElement> videoElements, boolean audioTransmission,
			boolean videoTransmission) {
		boolean success = true;
		for (WebElement video : videoElements) {
			if (!waitUntilSrcObjectDefined(video, "", 5000)) {
				System.err.println("srcObject of HTMLVideoElement was not defined!");
				return false;
			}
			boolean hasAudioTracks = this.hasAudioTracks(video, "");
			boolean hasVideoTracks = this.hasVideoTracks(video, "");
			System.out.println("Video " + video.getAttribute("id") + " has audio tracks [" + hasAudioTracks
					+ "] and has video tracks [" + hasVideoTracks + "]");
			success = success && (audioTransmission == hasAudioTracks) && (videoTransmission == hasVideoTracks);
			if (!success)
				break;
		}
		return success;
	}

	public boolean assertMediaTracks(Iterable<WebElement> videoElements, boolean audioTransmission,
			boolean videoTransmission, String parentSelector) {
		boolean success = true;
		for (WebElement video : videoElements) {
			if (!waitUntilSrcObjectDefined(video, "", 5000)) {
				System.err.println("srcObject of HTMLVideoElement was not defined!");
				return false;
			}
			success = success && (audioTransmission == this.hasAudioTracks(video, parentSelector))
					&& (videoTransmission == this.hasVideoTracks(video, parentSelector));
			if (!success)
				break;
		}
		return success;
	}

	private boolean hasAudioTracks(WebElement videoElement, String parentSelector) {
		String script = "return ((document.querySelector('" + parentSelector + (parentSelector.isEmpty() ? "" : " ")
				+ "#" + videoElement.getAttribute("id") + "').srcObject.getAudioTracks().length > 0)"
				+ " && (document.querySelector('" + parentSelector + (parentSelector.isEmpty() ? "" : " ") + "#"
				+ videoElement.getAttribute("id") + "').srcObject.getAudioTracks()[0].enabled))";
		boolean audioTracks = (boolean) ((JavascriptExecutor) driver).executeScript(script);
		return audioTracks;
	}

	private boolean hasVideoTracks(WebElement videoElement, String parentSelector) {
		String script = "return ((document.querySelector('" + parentSelector + (parentSelector.isEmpty() ? "" : " ")
				+ "#" + videoElement.getAttribute("id") + "').srcObject.getVideoTracks().length > 0)"
				+ " && (document.querySelector('" + parentSelector + (parentSelector.isEmpty() ? "" : " ") + "#"
				+ videoElement.getAttribute("id") + "').srcObject.getVideoTracks()[0].enabled))";
		boolean videoTracks = (boolean) ((JavascriptExecutor) driver).executeScript(script);
		return videoTracks;
	}

	private boolean waitUntilSrcObjectDefined(WebElement videoElement, String parentSelector, int maxMsWait) {
		final int sleepInterval = 50;
		int maxIterations = maxMsWait / sleepInterval;
		int counter = 0;
		boolean defined = srcObjectDefined(videoElement, parentSelector);
		while (!defined && counter < maxIterations) {
			try {
				Thread.sleep(sleepInterval);
			} catch (InterruptedException e) {
			}
			defined = srcObjectDefined(videoElement, parentSelector);
			counter++;
		}
		return defined;
	}

	private boolean srcObjectDefined(WebElement videoElement, String parentSelector) {
		String script = "return (!!(document.querySelector('" + parentSelector + (parentSelector.isEmpty() ? "" : " ")
				+ "#" + videoElement.getAttribute("id") + "').srcObject))";
		boolean defined = (boolean) ((JavascriptExecutor) driver).executeScript(script);
		return defined;
	}

}