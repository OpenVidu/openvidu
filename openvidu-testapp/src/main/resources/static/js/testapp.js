/*
 * (C) Copyright 2016 OpenVidu (http://kurento.org/)
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
var openVidu;
var session;

window.onload = function() {
	console = new Console('console', console);
}

function addVideoTag(stream) {

	var elementId = "video-" + stream.getId();
	var div = document.createElement('div');
	div.setAttribute("id", elementId);
	document.getElementById("participants").appendChild(div);

	stream.playThumbnail(elementId);

	// Check color
	var videoTag = document.getElementById("native-" + elementId);
	var userId = stream.getId();
	var canvas = document.createElement('CANVAS');
	checkColor(videoTag, canvas, userId);
}

function removeVideoTag(stream){
	
	var elementId = "video-" + stream.getId();	
	var element = document.getElementById(elementId);
	if (element) {
		element.parentNode.removeChild(element);
	}
}

function joinRoom() {

	var sessionId = document.getElementById('roomId').value;
	var participantId = document.getElementById('userId').value;

	openVidu = new OpenVidu('wss://' + location.host + '/');

	openVidu.connect(function(error, openVidu) {

		if (error)
			return console.log(error);

		var camera = openVidu.getCamera();

		camera.requestCameraAccess(function(error, camera) {

			if (error)
				return console.log(error);

			var sessionOptions = {
					sessionId : sessionId,
					participantId : participantId
				}
			
			openVidu.joinSession(sessionOptions, function(error, session) {
				
				if (error)
					return console.log(error);

				document.getElementById('room-header').innerText = 'ROOM \"'
						+ session.name + '\"';
				
				document.getElementById('join').style.display = 'none';
				document.getElementById('room').style.display = 'block';

				addVideoTag(camera);
				
				camera.publish();
				
				session.addEventListener("stream-added", function(streamEvent) {
					addVideoTag(streamEvent.stream);
				});

				session.addEventListener("stream-removed", function(streamEvent) {
					removeVideoTag(streamEvent.stream);
				});
				
			});						
		});
	});
}

function leaveRoom() {

	document.getElementById('join').style.display = 'block';
	document.getElementById('room').style.display = 'none';

	openVidu.close();
}

window.onbeforeunload = function() {
	openVidu.close();
};
