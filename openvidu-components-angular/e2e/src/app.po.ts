import { by, protractor, ElementFinder, ProtractorBrowser } from 'protractor';

export class OpenViduCall {
	constructor() {}

	getRoomInput(browser: ProtractorBrowser) {
		return this.getElementById(browser, 'roomInput');
	}

	getRoomJoinButton(browser: ProtractorBrowser): ElementFinder {
		return this.getElementById(browser, 'joinButton');
	}

	getShortRoomNameError(browser: ProtractorBrowser): ElementFinder {
		return this.getElementById(browser, 'shortNameError');
	}

	getRequiredRoomNameError(browser: ProtractorBrowser): ElementFinder {
		return this.getElementById(browser, 'requiredNameError');
	}

	getConfigCard(browser: ProtractorBrowser): ElementFinder {
		return this.getElementById(browser, 'roomConfig');
	}

	getConfigCardScreenShareButton(browser: ProtractorBrowser): ElementFinder {
		return this.getElementById(browser, 'configCardScreenButton');
	}

	getConfigCardCameraButton(browser: ProtractorBrowser): ElementFinder {
		return this.getElementById(browser, 'configCardCameraButton');
	}

	getConfigCardMicrophoneButton(browser: ProtractorBrowser): ElementFinder {
		return this.getElementById(browser, 'configCardMicrophoneButton');
	}

	getRoomContainer(browser: ProtractorBrowser): ElementFinder {
		return this.getElementById(browser, 'room-container');
	}

	getCloseButtonConfigCard(browser: ProtractorBrowser): ElementFinder {
		return browser.element(by.id('closeButton'));
	}


	getAllVideos(browser: ProtractorBrowser){
		return browser.element.all(by.tagName('video'));
	}

	getLeaveButton(browser: ProtractorBrowser): ElementFinder {
		return this.getElementById(browser, 'navLeaveButton');
  }

  getRoomCameraButton(browser: ProtractorBrowser): ElementFinder {
		return this.getElementById(browser, 'navCameraButton');
  }

  getCameraStatusDisabled(browser: ProtractorBrowser): ElementFinder {
		return this.getElementById(browser, 'statusCam');
	}

	getFullscreenButton(browser: ProtractorBrowser): ElementFinder {
		return this.getElementById(browser, 'fullscreenButton');
  }

  getRoomMicrophoneButton(browser: ProtractorBrowser): ElementFinder {
		return this.getElementById(browser, 'navMicrophoneButton');
	}

	getMicrophoneStatusDisabled(browser: ProtractorBrowser): ElementFinder {
		return this.getElementById(browser, 'statusMic');
  }

  getRoomScreenButton(browser: ProtractorBrowser): ElementFinder {
		return this.getElementById(browser, 'navScreenButton');
	}

	openNewBrowserInTheSameRoom(browser: ProtractorBrowser): ProtractorBrowser {
		return browser.forkNewDriverInstance(true);
	}

	getLocalNickname(browser: ProtractorBrowser): ElementFinder {
		return browser.element(by.css('#localUser #nickname'));
	}
	getRemoteNickname(browser: ProtractorBrowser): ElementFinder {
		return browser.element(by.css('#remoteUsers #nickname'));
	}

	getDialogNickname(browser: ProtractorBrowser): ElementFinder {
		return browser.element(by.css('#dialogNickname'));
	}

	getChatButton(browser: ProtractorBrowser): ElementFinder {
		return browser.element(by.css('#navChatButton'));
	}

	getVideo(browser: ProtractorBrowser): ElementFinder {
		return this.getChatContent(browser).element(by.css('video'));
	}


	getRemoteVideoList(browser): ElementFinder {
		return browser.element.all(by.css('#remoteUsers video'));
	}

	getChatContent(browser: ProtractorBrowser): ElementFinder {
		return browser.element(by.css('#chatComponent'));
	}

	getChatInput(browser: ProtractorBrowser): ElementFinder {
		return browser.element(by.id('chatInput'));
	}

	getNewMessagePoint(browser: ProtractorBrowser): ElementFinder {
		return browser.element(by.css('#mat-badge-content-0'));
	}

	pressEnter(browser: ProtractorBrowser) {
		browser.actions().sendKeys(protractor.Key.ENTER).perform();
	}

	getMessageList(browser: ProtractorBrowser) {
		return browser.element.all(by.css('#chatComponent .message-wrap .message .msg-detail'));
	}

	closeSession(browser: ProtractorBrowser) {
		const leaveButton = this.getLeaveButton(browser);
		leaveButton.click();
		browser.quit();
	}

	typeWithDelay(input, keys: string) {
		keys.split('').forEach((c) => input.sendKeys(c));
	}

	private getElementById(browser: ProtractorBrowser, id: string) {
		return browser.element(by.id(id));
	}
}