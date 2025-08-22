import { Builder, WebDriver } from 'selenium-webdriver';
import { TestAppConfig } from './selenium.conf';
import { OpenViduComponentsPO } from './utils.po.test';

let url = '';

describe('Testing API Directives', () => {
	let browser: WebDriver;
	let utils: OpenViduComponentsPO;
	async function createChromeBrowser(): Promise<WebDriver> {
		return await new Builder()
			.forBrowser(TestAppConfig.browserName)
			.withCapabilities(TestAppConfig.browserCapabilities)
			.setChromeOptions(TestAppConfig.browserOptions)
			.usingServer(TestAppConfig.seleniumAddress)
			.build();
	}

	beforeEach(async () => {
		browser = await createChromeBrowser();
		utils = new OpenViduComponentsPO(browser);
		url = `${TestAppConfig.appUrl}&roomName=API_DIRECTIVES_${Math.floor(Math.random() * 1000)}`;
	});

	afterEach(async () => {
		// console.log('data:image/png;base64,' + await browser.takeScreenshot());
		try {
			if (await utils.isPresent('#session-container')) {
				await utils.leaveRoom();
			}
		} catch (error) {}
		await browser.sleep(500);
		await browser.quit();
	});

	it('should set the MINIMAL UI', async () => {
		await browser.get(`${url}&minimal=true`);
		// Checking if prejoin page exist
		await utils.checkPrejoinIsPresent();

		// Checking if audio detection is not displayed
		expect(await utils.isPresent('#audio-wave-container')).toBeFalse();

		const joinButton = await utils.waitForElement('#join-button');
		await joinButton.click();

		// Checking if session container is present
		await utils.checkSessionIsPresent();

		// Checking if layout is present
		await utils.checkLayoutPresent();

		// Checking if stream component is present
		utils.checkStreamIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		// Checking if screenshare button is not present
		expect(await utils.isPresent('#screenshare-btn')).toBeFalse();

		// Checking if more options button is not present
		expect(await utils.isPresent('#more-options-btn')).toBeFalse();

		// Checking if participants panel button is not present
		expect(await utils.isPresent('#participants-panel-btn')).toBeFalse();

		// Checking if activities panel button is not present
		expect(await utils.isPresent('#activities-panel-btn')).toBeFalse();

		// Checking if logo is not displayed
		expect(await utils.isPresent('#branding-logo')).toBeFalse();

		// Checking if session name is not displayed
		expect(await utils.isPresent('#session-name')).toBeFalse();

		// Checking if nickname is not displayed
		expect(await utils.getNumberOfElements('#participant-name-container')).toEqual(0);

		// Checking if audio detection is not displayed
		expect(await utils.isPresent('#audio-wave-container')).toBeFalse();

		// Checking if settings button is not displayed
		expect(await utils.isPresent('#settings-container')).toBeFalse();
	});

	it('should change the UI LANG in prejoin page', async () => {
		await browser.get(`${url}&lang=es`);

		await utils.checkPrejoinIsPresent();

		await utils.waitForElement('.language-selector');

		const element = await utils.waitForElement('#join-button');
		expect(await element.getText()).toEqual('Unirme ahora');
	});

	it('should change the UI LANG in room page', async () => {
		await browser.get(`${url}&prejoin=false&lang=es`);

		await utils.checkLayoutPresent();
		await utils.checkToolbarIsPresent();

		await utils.togglePanel('settings');

		await utils.waitForElement('.sidenav-menu');
		expect(await utils.isPresent('#default-settings-panel')).toBeTrue();
		const panelTitle = await utils.waitForElement('.panel-title');
		expect(await panelTitle.getText()).toEqual('Configuración');

		const element = await utils.waitForElement('.lang-name');
		expect(await element.getAttribute('innerText')).toEqual('Español expand_more');
	});

	it('should override the LANG OPTIONS', async () => {
		await browser.get(`${url}&prejoin=true&langOptions=true`);

		await utils.checkPrejoinIsPresent();
		await utils.waitForElement('.language-selector');
		await utils.clickOn('.language-selector');
		await browser.sleep(500);
		expect(await utils.getNumberOfElements('.language-option')).toEqual(2);

		await utils.clickOn('.language-option');
		await browser.sleep(500);

		await utils.clickOn('#join-button');

		await utils.checkSessionIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		await utils.togglePanel('settings');

		await browser.sleep(500);

		await utils.waitForElement('#settings-container');
		await utils.waitForElement('.full-lang-button');
		await utils.clickOn('.full-lang-button');

		await browser.sleep(500);

		expect(await utils.getNumberOfElements('.language-option')).toEqual(2);
	});

	it('should show the PREJOIN page', async () => {
		await browser.get(`${url}&prejoin=true`);
		await utils.checkPrejoinIsPresent();
	});

	it('should not show the PREJOIN page', async () => {
		await browser.get(`${url}&prejoin=false`);

		await utils.checkSessionIsPresent();
	});

	it('should join to Room', async () => {
		await browser.get(`${url}`);

		// Checking if prejoin page exist
		await utils.checkPrejoinIsPresent();

		const joinButton = await utils.waitForElement('#join-button');
		await joinButton.click();

		// Checking if session container is present
		await utils.checkSessionIsPresent();

		await utils.checkToolbarIsPresent();

		// Checking if screenshare button is not present
		expect(await utils.isPresent('#screenshare-btn')).toBeTrue();
	});

	it('should show the token error WITH prejoin page', async () => {
		const fixedUrl = `${TestAppConfig.appUrl}&roomName=TEST_TOKEN&participantName=PNAME`;
		await browser.get(`${fixedUrl}`);

		// Checking if prejoin page exist
		await utils.checkPrejoinIsPresent();

		await utils.waitForElement('#join-button');
		await utils.clickOn('#join-button');

		// Checking if session container is present
		await utils.checkSessionIsPresent();

		// Starting new browser for adding a new participant
		const newTabScript = `window.open("${fixedUrl}")`;
		await browser.executeScript(newTabScript);

		// Go to first tab
		const tabs = await browser.getAllWindowHandles();
		browser.switchTo().window(tabs[1]);

		await utils.checkPrejoinIsPresent();
		await utils.waitForElement('#join-button');
		await utils.clickOn('#join-button');

		// Checking if token error is displayed
		await utils.waitForElement('#token-error');
		expect(await utils.isPresent('#token-error')).toBeTrue();
	});

	it('should show the token error WITHOUT prejoin page', async () => {
		const fixedUrl = `${TestAppConfig.appUrl}&roomName=TOKEN_ERROR&prejoin=false&participantName=PNAME`;
		await browser.get(`${fixedUrl}`);

		// Checking if session container is present
		await utils.checkSessionIsPresent();

		// Starting new browser for adding a new participant
		const newTabScript = `window.open("${fixedUrl}")`;
		await browser.executeScript(newTabScript);

		// Go to first tab
		const tabs = await browser.getAllWindowHandles();
		browser.switchTo().window(tabs[1]);

		// Checking if token error is displayed
		await utils.waitForElement('#openvidu-dialog');
		expect(await utils.isPresent('#openvidu-dialog')).toBeTrue();
	});

	it('should run the app with VIDEO DISABLED in prejoin page', async () => {
		await browser.get(`${url}&prejoin=true&videoEnabled=false`);

		await utils.checkPrejoinIsPresent();

		// Checking if video is displayed
		await utils.waitForElement('#video-poster');
		expect(await utils.getNumberOfElements('video')).toEqual(0);

		await utils.waitForElement('#videocam_off');

		await utils.clickOn('#join-button');

		await utils.checkSessionIsPresent();

		await utils.waitForElement('#videocam_off');
		expect(await utils.isPresent('#videocam_off')).toBeTrue();

		await utils.waitForElement('#video-poster');
		expect(await utils.getNumberOfElements('video')).toEqual(0);
	});

	it('should run the app with VIDEO DISABLED and WITHOUT PREJOIN page', async () => {
		await browser.get(`${url}&prejoin=false&videoEnabled=false`);

		await utils.checkSessionIsPresent();

		await utils.checkLayoutPresent();

		// Checking if video is displayed
		await utils.waitForElement('#video-poster');
		expect(await utils.getNumberOfElements('video')).toEqual(0);
		expect(await utils.getNumberOfElements('#video-poster')).toEqual(1);

		await utils.waitForElement('#videocam_off');
		expect(await utils.isPresent('#videocam_off')).toBeTrue();
	});

	it('should run the app with AUDIO DISABLED in prejoin page', async () => {
		await browser.get(`${url}&audioEnabled=false`);

		await utils.checkPrejoinIsPresent();

		// Checking if video is displayed
		await utils.checkVideoElementIsPresent();
		expect(await utils.getNumberOfElements('video')).toEqual(1);

		expect(await utils.getNumberOfElements('audio')).toEqual(0);
		await utils.waitForElement('#mic_off');
		expect(await utils.isPresent('#mic_off')).toBeTrue();

		await utils.clickOn('#join-button');

		await utils.checkSessionIsPresent();

		expect(await utils.getNumberOfElements('video')).toEqual(1);
		expect(await utils.getNumberOfElements('audio')).toEqual(0);
		await utils.waitForElement('#mic_off');
		expect(await utils.isPresent('#mic_off')).toBeTrue();
	});

	it('should run the app with AUDIO DISABLED and WITHOUT PREJOIN page', async () => {
		await browser.get(`${url}&prejoin=false&audioEnabled=false`);

		await browser.sleep(1000);
		await utils.checkSessionIsPresent();

		// Checking if video is displayed
		await utils.checkVideoElementIsPresent();
		expect(await utils.getNumberOfElements('video')).toEqual(1);

		expect(await utils.getNumberOfElements('audio')).toEqual(0);
		await utils.waitForElement('#mic_off');
		expect(await utils.isPresent('#mic_off')).toBeTrue();
	});

	it('should run the app without camera button', async () => {
		await browser.get(`${url}&prejoin=false&cameraBtn=false`);

		await utils.checkSessionIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		// Checking if camera button is not present
		expect(await utils.isPresent('#camera-btn')).toBeFalse();
	});

	it('should run the app without microphone button', async () => {
		await browser.get(`${url}&prejoin=false&microphoneBtn=false`);

		await utils.checkSessionIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		// Checking if microphone button is not present
		expect(await utils.isPresent('#microphone-btn')).toBeFalse();
	});

	it('should HIDE the SCREENSHARE button', async () => {
		await browser.get(`${url}&prejoin=false&screenshareBtn=false`);

		await utils.checkSessionIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		// Checking if screenshare button is not present
		expect(await utils.isPresent('#screenshare-btn')).toBeFalse();
	});

	it('should HIDE the FULLSCREEN button', async () => {
		await browser.get(`${url}&prejoin=false&fullscreenBtn=false`);

		await utils.checkSessionIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		await utils.toggleToolbarMoreOptions();
		expect(await utils.getNumberOfElements('#fullscreen-btn')).toEqual(0);
	});

	xit('should HIDE the CAPTIONS button', async () => {
		await browser.get(`${url}&prejoin=false&toolbarCaptionsBtn=false`);

		await utils.checkSessionIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		await utils.toggleToolbarMoreOptions();

		// Checking if captions button is not present
		expect(await utils.isPresent('#captions-btn')).toBeFalse();

		await utils.clickOn('#toolbar-settings-btn');

		await browser.sleep(500);

		await utils.waitForElement('.settings-container');
		expect(await utils.isPresent('.settings-container')).toBeTrue();

		expect(await utils.isPresent('#captions-opt')).toBeFalse();
	});

	it('should HIDE the TOOLBAR RECORDING button', async () => {
		await browser.get(`${url}&prejoin=false&toolbarRecordingButton=false`);

		await utils.checkSessionIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		await utils.toggleToolbarMoreOptions();

		// Checking if recording button is not present
		expect(await utils.isPresent('#recording-btn')).toBeFalse();
	});

	it('should HIDE the TOOLBAR BROADCASTING button', async () => {
		await browser.get(`${url}&prejoin=false&toolbarBroadcastingButton=false`);

		await utils.checkSessionIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		await utils.toggleToolbarMoreOptions();

		// Checking if broadcasting button is not present
		expect(await utils.isPresent('#broadcasting-btn')).toBeFalse();
	});

	it('should HIDE the TOOLBAR SETTINGS button', async () => {
		await browser.get(`${url}&prejoin=false&toolbarSettingsBtn=false`);

		await utils.checkSessionIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		// Open more options menu
		await utils.toggleToolbarMoreOptions();

		expect(await utils.isPresent('#toolbar-settings-btn')).toBeFalse();
	});

	it('should HIDE the LEAVE button', async () => {
		await browser.get(`${url}&prejoin=false&leaveBtn=false`);

		await utils.checkSessionIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		// Checking if leave button is not present
		expect(await utils.getNumberOfElements('#leave-btn')).toEqual(0);
	});

	it('should HIDE the ACTIVITIES PANEL button', async () => {
		await browser.get(`${url}&prejoin=false&activitiesPanelBtn=false`);

		await utils.checkSessionIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		// Checking if activities panel button is not present
		expect(await utils.isPresent('#activities-panel-btn')).toBeFalse();
	});

	it('should HIDE the CHAT PANEL button', async () => {
		await browser.get(`${url}&prejoin=false&chatPanelBtn=false`);

		await utils.checkSessionIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		// Checking if chat panel button is not present
		expect(await utils.isPresent('#chat-panel-btn')).toBeFalse();
	});

	it('should HIDE the PARTICIPANTS PANEL button', async () => {
		await browser.get(`${url}&prejoin=false&participantsPanelBtn=false`);

		await utils.checkSessionIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		// Checking if participants panel button is not present
		expect(await utils.isPresent('#participants-panel-btn')).toBeFalse();
	});

	it('should HIDE the LOGO', async () => {
		await browser.get(`${url}&prejoin=false&displayLogo=false`);

		await utils.checkSessionIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		// Checking if toolbar is present
		await utils.waitForElement('#info-container');
		expect(await utils.isPresent('#info-container')).toBeTrue();

		// Checking if logo is not displayed
		expect(await utils.isPresent('#branding-logo')).toBeFalse();
	});

	it('should HIDE the ROOM NAME', async () => {
		await browser.get(`${url}&prejoin=false&displayRoomName=false`);

		await utils.checkSessionIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		// Checking if toolbar is present
		await utils.waitForElement('#info-container');
		expect(await utils.isPresent('#info-container')).toBeTrue();

		// Checking if session name is not displayed
		expect(await utils.isPresent('#session-name')).toBeFalse();
	});

	it('should HIDE the PARTICIPANT NAME', async () => {
		await browser.get(`${url}&prejoin=false&displayParticipantName=false`);

		await utils.checkSessionIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		// Checking if stream component is present
		await utils.checkStreamIsPresent();

		// Checking if nickname is not present
		expect(await utils.isPresent('#participant-name-container')).toBeFalse();
	});

	it('should HIDE the AUDIO DETECTION element', async () => {
		await browser.get(`${url}&prejoin=false&displayAudioDetection=false`);

		await utils.checkSessionIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		// Checking if stream component is present
		await utils.checkStreamIsPresent();

		// Checking if audio detection is not present
		expect(await utils.isPresent('#audio-wave-container')).toBeFalse();
	});

	it('should HIDE the STREAM VIDEO CONTROLS button', async () => {
		await browser.get(`${url}&prejoin=false&videoControls=false`);

		await utils.checkSessionIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		// Checking if stream component is present
		await utils.checkStreamIsPresent();

		// Checking if settings button is not present
		expect(await utils.isPresent('.stream-video-controls')).toBeFalse();
	});

	it('should HIDE the MUTE button in participants panel', async () => {
		const roomName = 'e2etest';
		const fixedUrl = `${TestAppConfig.appUrl}&prejoin=false&participantMuteBtn=false&roomName=${roomName}`;
		await browser.get(fixedUrl);

		await utils.checkSessionIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		const participantsButton = await utils.waitForElement('#participants-panel-btn');
		await participantsButton.click();

		// Checking if participatns panel is displayed
		await utils.waitForElement('#participants-container');
		expect(await utils.isPresent('#participants-container')).toBeTrue();

		// Checking remote participants item
		expect(await utils.isPresent('#remote-participant-item')).toBeFalse();

		// Starting new browser for adding a new participant
		const newTabScript = `window.open("${fixedUrl}&participantName=SecondParticipant")`;
		await browser.executeScript(newTabScript);
		await browser.sleep(10000);

		// Go to first tab
		const tabs = await browser.getAllWindowHandles();
		browser.switchTo().window(tabs[0]);

		// Checking if mute button is not displayed in participant item
		await utils.waitForElement('#remote-participant-item');
		expect(await utils.isPresent('#remote-participant-item')).toBeTrue();

		expect(await utils.isPresent('#mute-btn')).toBeFalse();
	});

	it('should HIDE the RECORDING ACTIVITY in activities panel', async () => {
		let element;
		const fixedUrl = `${url}&prejoin=false&activitiesPanelRecordingActivity=false`;
		await browser.get(fixedUrl);

		await utils.checkSessionIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		element = await utils.waitForElement('#activities-panel-btn');
		await element.click();

		// Checking if participatns panel is displayed
		await utils.waitForElement('#default-activities-panel');
		expect(await utils.isPresent('#default-activities-panel')).toBeTrue();

		// await browser.sleep(1000);

		// Checking if recording activity exists
		await utils.waitForElement('.activities-body-container');
		expect(await utils.isPresent('ov-recording-activity')).toBeFalse();
	});

	it('should HIDE the BROADCASTING ACTIVITY in activities panel', async () => {
		await browser.get(`${url}&prejoin=false&activitiesPanelBroadcastingActivity=false`);

		await utils.checkSessionIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		await utils.waitForElement('#activities-panel-btn');
		await utils.clickOn('#activities-panel-btn');

		// Checking if participatns panel is displayed
		await utils.waitForElement('#default-activities-panel');
		expect(await utils.isPresent('#default-activities-panel')).toBeTrue();

		// await browser.sleep(1000);

		// Checking if recording activity exists
		await utils.waitForElement('.activities-body-container');
		expect(await utils.isPresent('ov-broadcasting-activity')).toBeFalse();
	});
});
