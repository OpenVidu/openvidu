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

const chromeArguments = ['--window-size=1024,768', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'];
const chromeArgumentsCI = [
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
	'--use-fake-device-for-media-stream'
];
const chromeArgumentsWithoutMediaDevices = ['--window-size=1024,768', '--deny-permission-prompts'];


const chromeArgumentsWithoutMediaDevicesCI = [
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

export const WebComponentConfig: BrowserConfig = {
	appUrl: 'http://localhost:8080/',
	seleniumAddress: LAUNCH_MODE === 'CI' ? 'http://localhost:3000/webdriver' : '',
	browserName: 'chrome',
	browserCapabilities: Capabilities.chrome().set('acceptInsecureCerts', true),
	browserOptions: new chrome.Options().excludeSwitches().addArguments(...(LAUNCH_MODE === 'CI' ? chromeArgumentsCI : chromeArguments))
};

export const AngularConfig: BrowserConfig = {
	appUrl: 'http://localhost:4200/#/testing',
	seleniumAddress: LAUNCH_MODE === 'CI' ? 'http://localhost:3000/webdriver' : '',
	browserName: 'Chrome',
	browserCapabilities: Capabilities.chrome().set('acceptInsecureCerts', true),
	browserOptions: new chrome.Options().addArguments(...(LAUNCH_MODE === 'CI' ? chromeArgumentsCI : chromeArguments))
};

export function getBrowserOptionsWithoutDevices() {
	if(LAUNCH_MODE === 'CI') {
		return new chrome.Options().addArguments(...chromeArgumentsWithoutMediaDevicesCI);
	} else {
		return new chrome.Options().addArguments(...chromeArgumentsWithoutMediaDevices);
	}
}

