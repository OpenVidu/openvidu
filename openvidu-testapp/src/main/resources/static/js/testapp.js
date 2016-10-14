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
var room;

window.onload = function() {
	console = new Console('console', console);
}

function playVideo(stream) {
	
	var elementId = "video-" + stream.getGlobalID();
	var div = document.createElement('div');
	div.setAttribute("id", elementId);
	document.getElementById("participants").appendChild(div);
	
	stream.playThumbnail(elementId);

	// Check color
	var videoTag = document.getElementById("native-" + elementId);
	var userId = stream.getGlobalID();
	var canvas = document.createElement('CANVAS');
	checkColor(videoTag, canvas, userId);
}

function register() {

	var userId = document.getElementById('name').value;
	var roomId = document.getElementById('roomName').value;

	var wsUri = 'wss://' + location.host + '/room';

	openVidu = new Main.OpenVidu(wsUri);
	
	openVidu.connect(function(error, openVidu) {

		if (error)
			return console.log(error);

		room = openVidu.Room({
			room : roomId,
			user : userId,
			subscribeToStreams : true
		});

		var camera = openVidu.Stream(room);

		camera.addEventListener("access-accepted", function() {

			room.addEventListener("room-connected", function(roomEvent) {

				document.getElementById('room-header').innerText = 'ROOM \"'
						+ room.name + '\"';
				document.getElementById('join').style.display = 'none';
				document.getElementById('room').style.display = 'block';

				camera.publish();

				var streams = roomEvent.streams;
				for (var i = 0; i < streams.length; i++) {
					playVideo(streams[i]);
				}
			});

			room.addEventListener("stream-added", function(streamEvent) {
				playVideo(streamEvent.stream);
			});

			room.addEventListener("stream-removed", function(streamEvent) {
				var element = document.getElementById("video-"
						+ streamEvent.stream.getGlobalID());
				if (element !== undefined) {
					element.parentNode.removeChild(element);
				}
			});

			playVideo(camera);

			room.connect();
		});

		camera.init();

	});
}

function leaveRoom() {

	document.getElementById('join').style.display = 'block';
	document.getElementById('room').style.display = 'none';

	var streams = room.getStreams();
	for (var index in streams) {
		var stream = streams[index];
		var element = document.getElementById("video-" + stream.getGlobalID());
		if (element) {
			element.parentNode.removeChild(element);
		}
	}
	
	openVidu.close();
}

window.onbeforeunload = function() {
	openVidu.close();
};
