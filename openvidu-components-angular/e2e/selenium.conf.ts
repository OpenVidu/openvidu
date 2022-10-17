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

let chromeArguments = ['--window-size=1024,768', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'];
let chromeArgumentsCI = [
	'--headless',
	'--no-sandbox',
	'--disable-extensions',
	'--disable-gpu',
	'--disable-dev-shm-usage',
	'--use-fake-ui-for-media-stream',
	'--use-fake-device-for-media-stream'
];

export const WebComponentConfig: BrowserConfig = {
	appUrl: 'http://localhost:8080/',
	seleniumAddress: LAUNCH_MODE === 'CI' ? 'http://localhost:3000/webdriver' : '',
	browserName: 'chrome',
	browserCapabilities: Capabilities.chrome().set('acceptInsecureCerts', true),
	browserOptions: new chrome.Options().addArguments(...(LAUNCH_MODE === 'CI' ? chromeArgumentsCI : chromeArguments))
};

export const AngularConfig: BrowserConfig = {
	appUrl: 'http://localhost:4200/#/testing',
	seleniumAddress: LAUNCH_MODE === 'CI' ? 'http://localhost:3000/webdriver' : '',
	browserName: 'Chrome',
	browserCapabilities: Capabilities.chrome().set('acceptInsecureCerts', true),
	browserOptions: new chrome.Options().addArguments(...(LAUNCH_MODE === 'CI' ? chromeArgumentsCI : chromeArguments))
};
