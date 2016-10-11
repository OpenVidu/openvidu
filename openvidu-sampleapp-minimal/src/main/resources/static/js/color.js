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
 *
 */
var colorMap = {};
var initTime;
var maxDistance = 60; // Default max distance for color comparison

window.onload = function() {
	initTime = new Date();
}

window.requestAnimationFrame = window.requestAnimationFrame
		|| window.mozRequestAnimationFrame
		|| window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;

function checkColor(video, canvas, userId) {

	canvas.width = 1;
	canvas.height = 1;
	var canvasContext = canvas.getContext("2d");

	video.crossOrigin = 'anonymous';

	function step() {
		var x = 0;
		var y = 0;

		try {
			canvasContext.drawImage(video, x, y, 1, 1, 0, 0, 1, 1);
		} catch (e) {
			// NS_ERROR_NOT_AVAILABLE can happen in Firefox due a bug
			if (e.name != "NS_ERROR_NOT_AVAILABLE") {
				throw e;
			}
		}

		var color = Array.prototype.slice.apply(
				canvasContext.getImageData(0, 0, 1, 1).data).toString();

		if (colorMap[userId]) {
			if (colorChanged(color, colorMap[userId].rgba)) {
				var time = new Date() - initTime;
				console.info("Detected color change on user " + userId
						+ " from " + colorMap[userId].rgba + " to " + color
						+ " at " + time);

				colorMap[userId].rgba = color;
				colorMap[userId].time = time;
			}
		} else {
			// First time
			var firstEntry = {
				rgba : "0,0,0,0",
				time : null
			};
			colorMap[userId] = firstEntry;
		}

		requestAnimationFrame(step);
	}
	requestAnimationFrame(step);
}

function colorChanged(expectedColorStr, realColorStr) {
	var realColor = realColorStr.split(",");
	var expectedColor = expectedColorStr.split(",");

	var realRed = realColor[0];
	var realGreen = realColor[1];
	var realBlue = realColor[2];

	var expectedRed = expectedColor[0];
	var expectedGreen = expectedColor[1];
	var expectedBlue = expectedColor[2];

	var distance = Math.sqrt((realRed - expectedRed) * (realRed - expectedRed)
			+ (realGreen - expectedGreen) * (realGreen - expectedGreen)
			+ (realBlue - expectedBlue) * (realBlue - expectedBlue));

	return distance > maxDistance;
}
