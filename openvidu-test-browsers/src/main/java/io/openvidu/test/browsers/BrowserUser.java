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

	public boolean assertAllElementsHaveTracks(String querySelector, boolean hasAudio, boolean hasVideo) {
		String calculateReturnValue = "returnValue && ";
		if (hasAudio) {
			calculateReturnValue += "el.srcObject.getAudioTracks().length === 1 && el.srcObject.getAudioTracks()[0].enabled";
		} else {
			calculateReturnValue += "el.srcObject.getAudioTracks().length === 0";
		}
		calculateReturnValue += " && ";
		if (hasVideo) {
			calculateReturnValue += "el.srcObject.getVideoTracks().length === 1 && el.srcObject.getVideoTracks()[0].enabled";
		} else {
			calculateReturnValue += "el.srcObject.getVideoTracks().length === 0";
		}
		String script = "var returnValue = true; document.querySelectorAll('" + querySelector
				+ "').forEach(el => { returnValue = " + calculateReturnValue + " }); return returnValue;";
		boolean tracks = (boolean) ((JavascriptExecutor) driver).executeScript(script);
		return tracks;
	}

	public void changeElementSize(WebElement videoElement, Integer newWidthInPixels, Integer newHeightInPixels) {
		String script = "var htmlelement = document.querySelector('#" + videoElement.getAttribute("id") + "');";
		if (newWidthInPixels != null) {
			script += "htmlelement.style.width = '" + newWidthInPixels + "px';";
		}
		if (newHeightInPixels != null) {
			script += "htmlelement.style.height = '" + newHeightInPixels + "px';";
		}
		((JavascriptExecutor) driver).executeScript(script);
	}

}