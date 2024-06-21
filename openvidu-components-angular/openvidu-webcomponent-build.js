const fs = require('fs-extra');
const concat = require('concat');
const VERSION = require('./package.json').version;
const ovWebcomponentRCPath = './dist/openvidu-webcomponent-rc';
const ovWebcomponentProdPath = './dist/openvidu-webcomponent';
const bundleName = 'openvidu-webcomponent-v2compatibility-' + VERSION;

module.exports.buildWebcomponent = async () => {
	console.log('Building OpenVidu Web Component (' + VERSION + ')');
	const tutorialWcPath = '../../openvidu-tutorials/openvidu-webcomponent/web';
	const e2eWcPath = './e2e/webcomponent-app';


	try {
		await buildElement();
		await copyFiles(tutorialWcPath);
		await copyFiles(e2eWcPath);
		await renameWebComponentTestName(e2eWcPath);

		console.log(`OpenVidu Web Component V2 Compatibility (${VERSION}) built`);
	} catch (error) {
		console.error(error);
	}
};

async function buildElement() {
	const files = [`${ovWebcomponentRCPath}/runtime.js`, `${ovWebcomponentRCPath}/main.js`, `${ovWebcomponentRCPath}/polyfills.js`];

	try {
		await fs.ensureDir('./dist/openvidu-webcomponent');
		await concat(files, `${ovWebcomponentProdPath}/${bundleName}.js`);
		await fs.copy(`${ovWebcomponentRCPath}/styles.css`, `${ovWebcomponentProdPath}/${bundleName}.css`);
		// await fs.copy(
		// 	"./dist/openvidu-webcomponent/assets",
		// 	"./openvidu-webcomponent/assets"
		// );
	} catch (err) {
		console.error('Error executing buildElement function in openvidu-webcomponent-builds.js');
		throw err;
	}
}

function renameWebComponentTestName(dir) {
	fs.renameSync(`${dir}/${bundleName}.js`, `${dir}/openvidu-webcomponent-dev.js`);
	fs.renameSync(`${dir}/${bundleName}.css`, `${dir}/openvidu-webcomponent-dev.css`);
}

async function copyFiles(destination) {
	if (fs.existsSync(destination)) {
		try {
			console.log(`Copying openvidu-webcomponent files from: ${ovWebcomponentProdPath} to: ${destination}`);
			await fs.ensureDir(ovWebcomponentProdPath);
			await fs.copy(ovWebcomponentProdPath, destination);
		} catch (err) {
			console.error('Error executing copy function in webcomponent-builds.js');
			throw err;
		}
	}
}

this.buildWebcomponent();
