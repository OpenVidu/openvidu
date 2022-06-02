import { LAUNCH_MODE } from './config';
import * as chrome from 'selenium-webdriver/chrome';
import { Capabilities } from 'selenium-webdriver';

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
	'--disable-dev-shm-usage',
	'--window-size=1024,768',
	'--use-fake-ui-for-media-stream',
	'--use-fake-device-for-media-stream',
	'--allow-insecure-localhost',
	'--ignore-certificate-errors'
];

export const WebComponentConfig: BrowserConfig = {
	appUrl: 'http://localhost:8080/',
	seleniumAddress: LAUNCH_MODE === 'CI' ? 'http://localhost:4444/wd/hub' : '',
	browserName: 'chrome',
	browserCapabilities: Capabilities.chrome().set('acceptInsecureCerts', true),
	browserOptions: new chrome.Options().addArguments(...(LAUNCH_MODE === 'CI' ? chromeArgumentsCI : chromeArguments))
};

export const AngularConfig: BrowserConfig = {
	appUrl: 'https://localhost:4200/#/testing',
	seleniumAddress: LAUNCH_MODE === 'CI' ? 'http://localhost:4444/wd/hub' : '',
	browserName: 'Chrome',
	browserCapabilities: Capabilities.chrome().set('acceptInsecureCerts', true),
	browserOptions: new chrome.Options().addArguments(...(LAUNCH_MODE === 'CI' ? chromeArgumentsCI : chromeArguments))
};
