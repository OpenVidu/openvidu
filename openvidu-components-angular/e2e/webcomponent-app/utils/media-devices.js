// Ideally we'd use an editor or import shaders directly from the API.
import { FilterStream } from './filter-stream.js';

export default function monkeyPatchMediaDevices() {
	const enumerateDevicesFn = MediaDevices.prototype.enumerateDevices;
	const getUserMediaFn = MediaDevices.prototype.getUserMedia;
	const getDisplayMediaFn = MediaDevices.prototype.getDisplayMedia;

	const fakeVideoDevice = {
		deviceId: 'virtual',
		groupID: '',
		kind: 'videoinput',
		label: 'custom_fake_video_1'
	};

	const fakeAudioDevice = {
		deviceId: 'virtual',
		groupID: '',
		kind: 'audioinput',
		label: 'custom_fake_audio_1'
	};

	const enumerateDevicesMonkeyPatch = async function () {
		const res = await enumerateDevicesFn.call(navigator.mediaDevices);
		res.push(fakeVideoDevice);
		res.push(fakeAudioDevice);
		return res;
	};

	const getUserMediaMonkeyPatch = async function () {
		const args = arguments[0];
		const { deviceId, advanced, width, height } = args.video;
		if (deviceId === 'virtual' || deviceId?.exact === 'virtual') {
			const constraints = {
				video: {
					facingMode: args.facingMode,
					advanced,
					width,
					height
				},
				audio: false
			};
			const res = await getUserMediaFn.call(navigator.mediaDevices, constraints);

			if (res) {
				const filter = new FilterStream(res, fakeVideoDevice.label);
				return filter.outputStream;
			}

			return res;
		}

		return getUserMediaFn.call(navigator.mediaDevices, ...arguments);
	};

	const getDisplayMediaMonkeyPatch = async function () {
		const { video, audio } = arguments[0];

		const screenVideoElement = document.getElementsByClassName('OV_video-element screen-type')[0];
		const currentTrackLabel = screenVideoElement?.srcObject?.getVideoTracks()[0]?.label;
		const res = await getDisplayMediaFn.call(navigator.mediaDevices, { video, audio });

		if (res && currentTrackLabel && currentTrackLabel !== 'custom_fake_screen') {
			const filter = new FilterStream(res, 'custom_fake_screen');
			return filter.outputStream;
		}

		return res;
	};

	MediaDevices.prototype.enumerateDevices = enumerateDevicesMonkeyPatch;
	navigator.mediaDevices.enumerateDevices = enumerateDevicesMonkeyPatch;
	MediaDevices.prototype.getUserMedia = getUserMediaMonkeyPatch;
	navigator.mediaDevices.getUserMedia = getUserMediaMonkeyPatch;
	MediaDevices.prototype.getDisplayMedia = getDisplayMediaMonkeyPatch;
	navigator.mediaDevices.getDisplayMedia = getDisplayMediaMonkeyPatch;
}
