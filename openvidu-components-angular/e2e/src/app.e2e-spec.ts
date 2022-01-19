import { OpenViduCall } from './app.po';
import { browser, Key } from 'protractor';
import { protractor } from 'protractor/built/ptor';

describe('Connect to the room', () => {
	const OVC = new OpenViduCall();

	beforeEach(() => {
		browser.waitForAngularEnabled(false);
		browser.get('#/call/');
	});

	it('should navigate to OpenVidu room', () => {
		const input = OVC.getRoomInput(browser);
		input.clear();
		input.sendKeys('OpenVidu');
		OVC.getRoomJoinButton(browser).click();
		expect(browser.getCurrentUrl()).toMatch('#/call/OpenVidu');
	});

	it('should show a short room name error', () => {
		const input = OVC.getRoomInput(browser);
		input.clear();
		input.sendKeys('OV');
		const shortError = OVC.getShortRoomNameError(browser);
		expect(shortError.isDisplayed()).toBeTruthy();
		OVC.getRoomJoinButton(browser).click();
		expect(browser.getCurrentUrl()).toMatch('#/call/');
	});

	it('should show a required name room error', async () => {
		const input = OVC.getRoomInput(browser);
		await input.sendKeys(Key.CONTROL, 'a');
		await input.sendKeys(Key.DELETE);
		expect(OVC.getRequiredRoomNameError(browser).isDisplayed()).toBeTruthy();
		OVC.getRoomJoinButton(browser).click();
		expect(browser.getCurrentUrl()).toMatch('#/call/');
	});
});

describe('Testing config card', () => {
	const OVC = new OpenViduCall();
	const EC = protractor.ExpectedConditions;

	beforeEach(() => {
		browser.waitForAngularEnabled(false);
		browser.get('#/call/OpenVidu');
	});

	it('should show the config card', () => {
		const configCard = OVC.getConfigCard(browser);
		browser.wait(EC.visibilityOf(configCard), 3000);
		expect(configCard.isDisplayed()).toBeTruthy();
	});

	it('should close the config card and go to home', () => {
		browser.wait(EC.visibilityOf(OVC.getConfigCard(browser)), 3000);
		expect(OVC.getConfigCard(browser).isDisplayed()).toBeTruthy();

		browser.wait(EC.elementToBeClickable(OVC.getCloseButtonConfigCard(browser)), 5000);
		OVC.getCloseButtonConfigCard(browser).click();
		expect(browser.getCurrentUrl()).toMatch('#/call/');

		// browser.wait(EC.elementToBeClickable(OVC.getCamButton(browser)), 5000);
		// OVC.getCamButton(browser).click();
		// browser.wait(EC.visibilityOf(OVC.getCamIcon(browser)), 5000);
		// expect(OVC.getCamIcon(browser).isDisplayed()).toBeTruthy();
	});

	it('should be able to mute the camera', async () => {
		let isVideoEnabled: boolean;
		const videoEnableScript =
			'const videoTrack = document.getElementsByTagName("video")[0].srcObject.getVideoTracks()[0]; return videoTrack.enabled;';

		browser.wait(EC.elementToBeClickable(OVC.getConfigCardCameraButton(browser)), 5000);

		OVC.getAllVideos(browser).then((videos) => {
			expect(videos.length).toEqual(1);
		});

		isVideoEnabled = await browser.executeScript(videoEnableScript);
		expect(isVideoEnabled).toBe(true);

		OVC.getConfigCardCameraButton(browser).click();
		isVideoEnabled = await browser.executeScript(videoEnableScript);
		expect(isVideoEnabled).toBe(false);
	});

	it('should be able to mute the microphone', async () => {
		let isAudioEnabled: boolean;
		const audioEnableScript =
			'const audioTrack = document.getElementsByTagName("video")[0].srcObject.getAudioTracks()[0]; return audioTrack.enabled;';

		browser.wait(EC.elementToBeClickable(OVC.getConfigCardMicrophoneButton(browser)), 5000);

		OVC.getAllVideos(browser).then((videos) => {
			expect(videos.length).toEqual(1);
		});

		isAudioEnabled = await browser.executeScript(audioEnableScript);
		expect(isAudioEnabled).toBe(true);

		OVC.getConfigCardMicrophoneButton(browser).click();
		isAudioEnabled = await browser.executeScript(audioEnableScript);
		expect(isAudioEnabled).toBe(false);
	});

	// Unable to share screen in a headless chrome
	xit('should be able to share the screen', async () => {
		browser.wait(EC.elementToBeClickable(OVC.getConfigCardScreenShareButton(browser)), 5000);

		OVC.getAllVideos(browser).then((videos) => {
			expect(videos.length).toEqual(1);
		});

		OVC.getConfigCardScreenShareButton(browser).click();

		OVC.getAllVideos(browser).then((videos) => {
			expect(videos.length).toEqual(2);
		});
	});

	// Unable to share screen in a headless chrome
	xit('should be able to share the screen and remove the camera video if it is muted', () => {
		browser.wait(EC.elementToBeClickable(OVC.getConfigCardScreenShareButton(browser)), 5000);
		browser.wait(EC.elementToBeClickable(OVC.getConfigCardCameraButton(browser)), 5000);

		OVC.getAllVideos(browser).then((videos) => {
			expect(videos.length).toEqual(1);
		});

		OVC.getConfigCardCameraButton(browser).click();

		OVC.getAllVideos(browser).then((videos) => {
			expect(videos.length).toEqual(1);
		});

		OVC.getConfigCardScreenShareButton(browser).click();

		OVC.getAllVideos(browser).then((videos) => {
			expect(videos.length).toEqual(1);
		});
	});

	// Unable to share screen in a headless chrome
	xit('should be able to add the camera video when the screen is active clicking on camera button', () => {
		browser.wait(EC.elementToBeClickable(OVC.getConfigCardScreenShareButton(browser)), 5000);
		browser.wait(EC.elementToBeClickable(OVC.getConfigCardCameraButton(browser)), 5000);

		OVC.getAllVideos(browser).then((videos) => {
			expect(videos.length).toEqual(1);
		});

		OVC.getConfigCardCameraButton(browser).click();

		OVC.getAllVideos(browser).then((videos) => {
			expect(videos.length).toEqual(1);
		});

		OVC.getConfigCardScreenShareButton(browser).click();

		OVC.getAllVideos(browser).then((videos) => {
			expect(videos.length).toEqual(1);
		});

		OVC.getConfigCardCameraButton(browser).click();

		OVC.getAllVideos(browser).then((videos) => {
			expect(videos.length).toEqual(2);
		});
	});

	it('should be able to add the camera video disabling screen share', () => {
		browser.wait(EC.elementToBeClickable(OVC.getConfigCardScreenShareButton(browser)), 5000);
		browser.wait(EC.elementToBeClickable(OVC.getConfigCardCameraButton(browser)), 5000);

		OVC.getAllVideos(browser).then((videos) => {
			expect(videos.length).toEqual(1);
		});

		OVC.getConfigCardCameraButton(browser).click();

		OVC.getAllVideos(browser).then((videos) => {
			expect(videos.length).toEqual(1);
		});
		OVC.getConfigCardScreenShareButton(browser).click();

		OVC.getAllVideos(browser).then((videos) => {
			expect(videos.length).toEqual(1);
		});

		OVC.getConfigCardScreenShareButton(browser).click();

		OVC.getAllVideos(browser).then((videos) => {
			expect(videos.length).toEqual(1);
		});
	});

	it('should be able to join to room', async () => {
		browser.wait(EC.elementToBeClickable(OVC.getRoomJoinButton(browser)), 5000);
		OVC.getRoomJoinButton(browser).click();
		expect(OVC.getRoomContainer(browser).isDisplayed()).toBeTruthy();
	});
});

describe('Testing room', () => {
	const OVC = new OpenViduCall();
	const EC = protractor.ExpectedConditions;

	beforeEach(() => {
		browser.waitForAngularEnabled(false);
		browser.get('#/call/');
		browser.wait(EC.elementToBeClickable(OVC.getRoomJoinButton(browser)), 5000);
		OVC.getRoomJoinButton(browser).click();
		browser.sleep(1000);

		browser.wait(EC.elementToBeClickable(OVC.getRoomJoinButton(browser)), 5000);
		OVC.getRoomJoinButton(browser).click();
		browser.sleep(1000);
	});

	afterEach(() => {
		browser.wait(EC.elementToBeClickable(OVC.getLeaveButton(browser)), 5000);
		OVC.getLeaveButton(browser).click();
		expect(expect(browser.getCurrentUrl()).toMatch('#/call/'));
	});

	it('should be able to mute the camera', async () => {
		let isVideoEnabled: boolean;
		const videoEnableScript =
			'const videoTrack = document.getElementsByTagName("video")[0].srcObject.getVideoTracks()[0]; return videoTrack.enabled;';

		browser.wait(EC.elementToBeClickable(OVC.getRoomCameraButton(browser)), 5000);

		OVC.getAllVideos(browser).then((videos) => {
			expect(videos.length).toEqual(1);
		});

		isVideoEnabled = await browser.executeScript(videoEnableScript);
		expect(isVideoEnabled).toBe(true);

		OVC.getRoomCameraButton(browser).click();
		isVideoEnabled = await browser.executeScript(videoEnableScript);

		expect(isVideoEnabled).toBe(false);

		// Uncomment when muted video is shown
		// expect(OVC.getCameraStatusDisabled(browser).isDisplayed()).toBe(true);
	});

	it('should be able to mute the microphone', async () => {
		let isAudioEnabled: boolean;
		const audioEnableScript =
			'const audioTrack = document.getElementsByTagName("video")[0].srcObject.getAudioTracks()[0]; return audioTrack.enabled;';

		browser.wait(EC.elementToBeClickable(OVC.getRoomMicrophoneButton(browser)), 5000);

		OVC.getAllVideos(browser).then((videos) => {
			expect(videos.length).toEqual(1);
		});

		isAudioEnabled = await browser.executeScript(audioEnableScript);
		expect(isAudioEnabled).toBe(true);

		OVC.getRoomMicrophoneButton(browser).click();
		isAudioEnabled = await browser.executeScript(audioEnableScript);
		expect(isAudioEnabled).toBe(false);
		expect(OVC.getMicrophoneStatusDisabled(browser).isDisplayed()).toBe(true);
	});

	// Unable to share screen in a headless chrome
	xit('should be able to share the screen', () => {
		browser.wait(EC.elementToBeClickable(OVC.getRoomScreenButton(browser)), 5000);

		OVC.getAllVideos(browser).then((videos) => {
			expect(videos.length).toEqual(1);
		});

		browser.sleep(3000);
		OVC.getRoomScreenButton(browser).click();

		OVC.getAllVideos(browser).then((videos) => {
			expect(videos.length).toEqual(2);
		});
	});

	// Unable to share screen in a headless chrome
	xit('should be able to share the screen and remove the camera video if it is muted', () => {
		browser.wait(EC.elementToBeClickable(OVC.getRoomScreenButton(browser)), 5000);
		browser.wait(EC.elementToBeClickable(OVC.getRoomCameraButton(browser)), 5000);

		OVC.getAllVideos(browser).then((videos) => {
			expect(videos.length).toEqual(1);
		});

		OVC.getRoomCameraButton(browser).click();

		OVC.getAllVideos(browser).then((videos) => {
			expect(videos.length).toEqual(1);
		});

		OVC.getRoomScreenButton(browser).click();

		OVC.getAllVideos(browser).then((videos) => {
			expect(videos.length).toEqual(1);
		});
	});

	// Unable to share screen in a headless chrome
	xit('should be able to add the camera video disabling screen share', () => {
		browser.wait(EC.elementToBeClickable(OVC.getRoomScreenButton(browser)), 5000);
		browser.wait(EC.elementToBeClickable(OVC.getRoomCameraButton(browser)), 5000);

		OVC.getAllVideos(browser).then((videos) => {
			expect(videos.length).toEqual(1);
		});

		OVC.getRoomCameraButton(browser).click();

		OVC.getAllVideos(browser).then((videos) => {
			expect(videos.length).toEqual(1);
		});

		OVC.getRoomScreenButton(browser).click();
		OVC.getAllVideos(browser).then((videos) => {
			expect(videos.length).toEqual(1);
		});

		OVC.getRoomScreenButton(browser).click();
		OVC.getAllVideos(browser).then((videos) => {
			expect(videos.length).toEqual(1);
		});
	});

	it('should enable and disable fullscreen', () => {
		browser.wait(EC.elementToBeClickable(OVC.getFullscreenButton(browser)), 5000);
		const button = OVC.getFullscreenButton(browser);
		button.click();
		browser.sleep(1000);
		browser.driver
			.manage()
			.window()
			.getSize()
			.then((value) => {
				expect(value.width === OVC.getVideo(browser).width && value.height === OVC.getVideo(browser).height);
				button.click();
				browser.driver
					.manage()
					.window()
					.getSize()
					.then((value2) => {
						expect(value2.width !== OVC.getVideo(browser).width && value2.height !== OVC.getVideo(browser).height);
					});
			});
	});
});