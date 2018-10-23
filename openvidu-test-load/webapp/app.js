var OPENVIDU_SERVER_URL;
var OPENVIDU_SERVER_SECRET;
var SESSION_ID;

var OV;
var session;
var rtcPeerConnectionStats = {};

window.onload = () => {
	var url = new URL(window.location.href);
	OPENVIDU_SERVER_URL = url.searchParams.get("publicurl");
	OPENVIDU_SERVER_SECRET = url.searchParams.get("secret");
	SESSION_ID = url.searchParams.get("sessionId");
	USER_ID = url.searchParams.get("userId");
	if (!OPENVIDU_SERVER_URL || !OPENVIDU_SERVER_SECRET || !SESSION_ID || !USER_ID) {
		initFormValues();
		document.getElementById('join-form').style.display = 'block';
	} else {
		joinSession();
	}
};

function joinSession() {
	OV = new OpenVidu();
	session = OV.initSession();

	session.on("streamCreated", event => {
		var subscriber = session.subscribe(event.stream, insertVideoContainer(event));
		subscriber.on('videoPlaying', e => {
			var userId = event.stream.connection.data;
			gatherStats(event.stream.getRTCPeerConnection(), userId);
			rtcPeerConnectionStats[userId] = {
				interval: window.setInterval(
					() => {
						gatherStats(event.stream.getRTCPeerConnection(), userId);
					}, 1000)
			}
		});
	});

	session.on("streamDestroyed", event => {
		var userId = event.stream.connection.data;
		window.clearInterval(rtcPeerConnectionStats[userId].interval);
		delete rtcPeerConnectionStats[userId];
		document.getElementById('video-' + userId).outerHTML = "";
	});

	getToken().then(token => {
		session.connect(token, USER_ID)
			.then(() => {
				var publisher = OV.initPublisher('local', { resolution: "540x320", frameRate: 30 });
				session.publish(publisher);
			})
			.catch(error => {
				console.log("There was an error connecting to the session:", error.code, error.message);
			});
	});

}

function leaveSession() {
	session.disconnect();
}

window.onbeforeunload = () => {
	if (session) leaveSession();
};

function insertVideoContainer(event) {
	var commonTagStyle = "background-color: #0088aa; color: white; font-weight: bold; padding: 2px 5px; border-radius: 3px; font-family: 'Arial'";
	var videoContainer = document.createElement('div');
	videoContainer.id = 'video-' + event.stream.connection.data;
	videoContainer.setAttribute("style", "display: inline-block; margin: 5px 5px 0 0");
	var infoContainer = document.createElement('div');
	infoContainer.setAttribute("style", "text-align: center; margin-bottom: 3px");
	var userId = document.createElement('div');
	userId.setAttribute("style", "float: left; " + commonTagStyle);
	userId.innerText = event.stream.connection.data;
	var resolution = document.createElement('div');
	resolution.id = 'resolution-' + event.stream.connection.data;
	resolution.setAttribute("style", "display: inline-block; " + commonTagStyle);
	resolution.innerText = event.stream.videoDimensions.width + 'x' + event.stream.videoDimensions.height;
	var bitrate = document.createElement('div');
	bitrate.id = 'bitrate-' + event.stream.connection.data;
	bitrate.setAttribute("style", "float: right; " + commonTagStyle);
	infoContainer.appendChild(userId);
	infoContainer.appendChild(resolution);
	infoContainer.appendChild(bitrate);
	videoContainer.appendChild(infoContainer);
	document.body.appendChild(videoContainer);
	return videoContainer;
}

function initFormValues() {
	document.getElementById("form-publicurl").value = OPENVIDU_SERVER_URL;
	document.getElementById("form-secret").value = OPENVIDU_SERVER_SECRET;
	document.getElementById("form-sessionId").value = SESSION_ID;
	document.getElementById("form-userId").value = USER_ID;
}

function joinWithForm() {
	OPENVIDU_SERVER_URL = document.getElementById("form-publicurl").value;
	OPENVIDU_SERVER_SECRET = document.getElementById("form-secret").value;
	SESSION_ID = document.getElementById("form-sessionId").value;
	USER_ID = document.getElementById("form-userId").value;
	document.getElementById('join-form').style.display = 'none';
	joinSession();
	return false;
}

function getToken() {
	return createSession().then(sessionId => createToken(sessionId));
}

function createSession() { // See https://openvidu.io/docs/reference-docs/REST-API/#post-apisessions
	return new Promise((resolve, reject) => {
		var request = new XMLHttpRequest();
		request.open("POST", OPENVIDU_SERVER_URL + "api/sessions", true);
		request.setRequestHeader('Content-Type', 'application/json');
		request.setRequestHeader('Authorization', "Basic " + btoa("OPENVIDUAPP:" + OPENVIDU_SERVER_SECRET));
		request.onreadystatechange = () => {
			if (request.readyState === 4) {
				if (request.status === 200 || request.status === 409) {
					resolve(SESSION_ID);
				} else {
					console.warn('No connection to OpenVidu Server. This may be a certificate error at ' + OPENVIDU_SERVER_URL);
					if (window.confirm('No connection to OpenVidu Server. This may be a certificate error at \"' + OPENVIDU_SERVER_URL + '\"\n\nClick OK to navigate and accept it. ' +
						'If no certificate warning is shown, then check that your OpenVidu Server is up and running at "' + OPENVIDU_SERVER_URL + '"')) {
						location.assign(OPENVIDU_SERVER_URL + '/accept-certificate');
					}
				}
			};
		}
		request.send(JSON.stringify({ customSessionId: SESSION_ID }));
	});
}

function createToken() { // See https://openvidu.io/docs/reference-docs/REST-API/#post-apitokens
	return new Promise((resolve, reject) => {
		var request = new XMLHttpRequest();
		request.open("POST", OPENVIDU_SERVER_URL + "api/tokens", true);
		request.setRequestHeader('Content-Type', 'application/json');
		request.setRequestHeader('Authorization', "Basic " + btoa("OPENVIDUAPP:" + OPENVIDU_SERVER_SECRET));
		request.onreadystatechange = () => {
			if (request.readyState === 4) {
				if (request.status == 200) {
					resolve(JSON.parse(request.response).token);
				} else {
					reject(new Error(request.responseText))
				}
			};
		}
		request.send(JSON.stringify({ session: SESSION_ID }));
	});
}

function gatherStats(rtcPeerConnection, userId, errorCallback) {
	return rtcPeerConnection.getStats(response => {
		const fullReport = [];
		response.result().forEach(report => {
			const stat = {
				id: report.id,
				timestamp: report.timestamp,
				type: report.type
			};
			report.names().forEach((name) => {
				stat[name] = report.stat(name);
			});
			fullReport.push(stat);
		});
		if (!rtcPeerConnectionStats[userId].rtt) {
			var activeCandidateStats = fullReport.find(report => report.type === 'googCandidatePair' && report.googActiveConnection === 'true');
			if (!!activeCandidateStats) {
				rtcPeerConnectionStats[userId] = {
					rtt: activeCandidateStats.googRtt,
					transport: activeCandidateStats.googTransportType,
					candidateType: activeCandidateStats.googRemoteCandidateType,
					localAddress: activeCandidateStats.googLocalAddress,
					remoteAddress: activeCandidateStats.googRemoteAddress,
					interval: rtcPeerConnectionStats[userId].interval
				}
			}
		}
		var videoStats = fullReport.find(report => report.type === 'ssrc' && report.mediaType === 'video');
		if (!!videoStats) {
			rtcPeerConnectionStats[userId].bitRate = (videoStats.bytesReceived - rtcPeerConnectionStats[userId].bytesReceived) * 8 / 1000;
			rtcPeerConnectionStats[userId].jitter = videoStats.googJitterBufferMs;
			rtcPeerConnectionStats[userId].bytesReceived = videoStats.bytesReceived;
			rtcPeerConnectionStats[userId].delay = videoStats.googCurrentDelayMs;
			rtcPeerConnectionStats[userId].packetsLost = videoStats.packetsLost;
			document.querySelector('#bitrate-' + userId).innerText = Math.floor(rtcPeerConnectionStats[userId].bitRate) + ' kbps';
		}
		console.log(rtcPeerConnectionStats);
	}, null, errorCallback);
}