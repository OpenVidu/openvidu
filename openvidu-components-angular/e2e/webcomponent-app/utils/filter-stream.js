class FilterStream {
	constructor(stream, label) {
		const videoTrack = stream.getVideoTracks()[0];
		const { width, height } = videoTrack.getSettings();
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');
		const video = document.createElement('video');
		video.srcObject = new MediaStream([videoTrack]);
		video.play();

		video.addEventListener('play', () => {
			const loop = () => {
				if (!video.paused && !video.ended) {
					ctx.filter = 'grayscale(100%)';
                    ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight, 0, 0, video.videoWidth, video.videoHeight);
					setTimeout(loop, 33);
				}
			};
			loop();
		});
		this.outputStream = canvas.captureStream();

		Object.defineProperty(this.outputStream.getVideoTracks()[0], 'label', {
			writable: true,
			value: label
		});
	}
}

export { FilterStream };
