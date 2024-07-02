const fs = require('fs');

// Tutorial paths as key-value pairs
const tutorialPaths = {
	ovToolbar: '../../openvidu-livekit-tutorials/openvidu-components/openvidu-custom-toolbar/src/app/app.component.ts',
	ovToolbarAdditionalButtons: '../../openvidu-livekit-tutorials/openvidu-components/openvidu-toolbar-buttons/src/app/app.component.ts',
	ovToolbarAdditionalPanelButtons:
		'../../openvidu-livekit-tutorials/openvidu-components/openvidu-toolbar-panel-buttons/src/app/app.component.ts',
	ovPanel: '../../openvidu-livekit-tutorials/openvidu-components/openvidu-custom-panels/src/app/app.component.ts',
	ovAdditionalPanels: '../../openvidu-livekit-tutorials/openvidu-components/openvidu-additional-panels/src/app/app.component.ts',
	ovChatPanel: '../../openvidu-livekit-tutorials/openvidu-components/openvidu-custom-chat-panel/src/app/app.component.ts',
	ovActivitiesPanel: '../../openvidu-livekit-tutorials/openvidu-components/openvidu-custom-activities-panel/src/app/app.component.ts',
	ovParticipantsPanel: '../../openvidu-livekit-tutorials/openvidu-components/openvidu-custom-participants-panel/src/app/app.component.ts',
	ovParticipantPanelItem:
		'../../openvidu-livekit-tutorials/openvidu-components/openvidu-custom-participant-panel-item/src/app/app.component.ts',
	ovParticipantPanelItemElements:
		'../../openvidu-livekit-tutorials/openvidu-components/openvidu-custom-participant-panel-item-elements/src/app/app.component.ts',
	ovLayout: '../../openvidu-livekit-tutorials/openvidu-components/openvidu-custom-layout/src/app/app.component.ts',
	ovStream: '../../openvidu-livekit-tutorials/openvidu-components/openvidu-custom-stream/src/app/app.component.ts'
};

// Path of the file where to copy the text
const targetFile = 'projects/openvidu-components-angular/src/lib/directives/template/openvidu-components-angular.directive.ts';

// Function to read a file based on the path and return its content
function readFile(path) {
	try {
		return fs.readFileSync(path, 'utf-8');
	} catch (error) {
		console.error(`Error reading the file ${path}: ${error.message}`);
		return null;
	}
}

// Function to write content between two specific lines in the specified file
function writeContentToFile(file, startLine, endLine, content) {
	try {
		const lines = fs.readFileSync(file, 'utf-8').split('\n');
		const startIndex = lines.findIndex((line) => line.includes(startLine));
		let endIndex = lines.findIndex((line) => line.includes(endLine));

		if (startIndex !== -1 && endIndex !== -1) {
			const codeBlock = ['* ```typescript', ...content.split('\n').map((line) => `* ${line}`), '* ```'];
			// Remove lines between startLine and endLine
			lines.splice(startIndex + 1, endIndex - startIndex - 1);

			// Update the end index
			endIndex = lines.findIndex((line) => line.includes(endLine));

			// Insert the new code block
			lines.splice(endIndex, 0, ...codeBlock);

			fs.writeFileSync(file, lines.join('\n'));
			console.log(`Content added successfully to ${file}`);
		} else {
			console.error(`The specified lines were not found in ${file}`);
		}
	} catch (error) {
		console.error(`Error writing to the file ${file}: ${error.message}`);
	}
}

// Iterate over the tutorialPaths object and copy content to targetFile
for (const key in tutorialPaths) {
	if (tutorialPaths.hasOwnProperty(key)) {
		const tutorialPath = tutorialPaths[key];
		const tutorialContent = readFile(tutorialPath);
		const startLine = `<!--${key}-start-tutorial-->`;
		const endLine = `<!--${key}-end-tutorial-->`;

		if (tutorialContent) {
			writeContentToFile(targetFile, startLine, endLine, tutorialContent);
		}
	}
}
