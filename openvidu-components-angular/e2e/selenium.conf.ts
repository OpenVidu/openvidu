import { Capabilities } from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome';
import { LAUNCH_MODE } from './config';

interface BrowserConfig {
	appUrl: string;
	seleniumAddress: string;
	browserCapabilities: Capabilities;
	browserOptions: chrome.Options;
	browserName: string;
}

const audioPath = LAUNCH_MODE === 'CI' ? `e2e-assets/audio_test.wav` : 'e2e/assets/audio_test.wav';

const chromeArguments = [
	'--window-size=1300,1000',
	// '--headless',
	'--use-fake-ui-for-media-stream',
	'--use-fake-device-for-media-stream',
	`--use-file-for-fake-audio-capture=${audioPath}`
];
const chromeArgumentsCI = [
	'--window-size=1300,1000',
	'--headless',
	'--no-sandbox',
	'--disable-gpu',
	'--disable-popup-blocking',
	'--no-first-run',
	'--no-default-browser-check',
	'--disable-dev-shm-usage',
	'--disable-background-networking',
	'--disable-default-apps',
	'--use-fake-ui-for-media-stream',
	'--use-fake-device-for-media-stream',
	`--use-file-for-fake-audio-capture=${audioPath}`,
	'--autoplay-policy=no-user-gesture-required',
	'--allow-file-access-from-files'
];
const chromeArgumentsWithoutMediaDevices = ['--headless', '--window-size=1300,900', '--deny-permission-prompts'];
const chromeArgumentsWithoutMediaDevicesCI = [
	'--window-size=1300,900',
	'--headless',
	'--no-sandbox',
	'--disable-gpu',
	'--disable-popup-blocking',
	'--no-first-run',
	'--no-default-browser-check',
	'--disable-dev-shm-usage',
	'--disable-background-networking',
	'--disable-default-apps',
	'--deny-permission-prompts'
];

export const TestAppConfig: BrowserConfig = {
	appUrl: 'http://localhost:4200/#/call?staticVideos=false',
	seleniumAddress: LAUNCH_MODE === 'CI' ? 'http://localhost:4444/wd/hub' : '',
	browserName: 'chrome',
	browserCapabilities: Capabilities.chrome().set('acceptInsecureCerts', true),
	browserOptions: new chrome.Options()
		.addArguments(...(LAUNCH_MODE === 'CI' ? chromeArgumentsCI : chromeArguments)) as chrome.Options
};

export const NestedConfig: BrowserConfig = {
	appUrl: 'http://localhost:4200/#/testing',
	seleniumAddress: LAUNCH_MODE === 'CI' ? 'http://localhost:4444/wd/hub' : '',
	browserName: 'Chrome',
	browserCapabilities: Capabilities.chrome().set('acceptInsecureCerts', true),
	browserOptions: new chrome.Options()
		.addArguments(...(LAUNCH_MODE === 'CI' ? chromeArgumentsCI : chromeArguments)) as chrome.Options
};

export function getBrowserOptionsWithoutDevices() {
	if (LAUNCH_MODE === 'CI') {
		return new chrome.Options().addArguments(...chromeArgumentsWithoutMediaDevicesCI) as chrome.Options;
	} else {
		return new chrome.Options().addArguments(...chromeArgumentsWithoutMediaDevices) as chrome.Options;
	}
}
