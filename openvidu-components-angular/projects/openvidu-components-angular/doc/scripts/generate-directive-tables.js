const fs = require('fs');
const glob = require('glob');

const startApiLine = '<!-- start-dynamic-api-directives-content -->';
const apiDirectivesTable =
	'| **Parameter** | **Type** | **Reference** | \n' +
	'|:--------------------------------: | :-------: | :---------------------------------------------: |';
const endApiLine = '<!-- end-dynamic-api-directives-content -->';

function getDirectiveFiles() {
	// Directory where directive files are located
	const directivesDir = 'projects/openvidu-components-angular/src/lib/directives/api';
	return listFiles(directivesDir, '.directive.ts');
}

function getComponentFiles() {
	// Directory where component files are located
	const componentsDir = 'projects/openvidu-components-angular/src/lib/components';
	return listFiles(componentsDir, '.component.ts');
}

function getAdminFiles() {
	// Directory where component files are located
	const componentsDir = 'projects/openvidu-components-angular/src/lib/admin';
	return listFiles(componentsDir, '.component.ts');
}

function listFiles(directoryPath, fileExtension) {
	const files = glob.sync(`${directoryPath}/**/*${fileExtension}`);
	if (files.length === 0) {
		throw new Error(`No ${fileExtension} files found in ${directoryPath}`);
	}
	return files;
}

function initializeDynamicTableContent(filePath) {
	replaceDynamicTableContent(filePath, apiDirectivesTable);
}

function removeApiTableContent(filePath) {
	const content = '_No API directives available for this component_. \n';
	replaceDynamicTableContent(filePath, content);
}

function apiTableContentIsEmpty(filePath) {
	try {
		const data = fs.readFileSync(filePath, 'utf8');
		const startIdx = data.indexOf(startApiLine);
		const endIdx = data.indexOf(endApiLine);
		if (startIdx !== -1 && endIdx !== -1) {
			const capturedContent = data.substring(startIdx + startApiLine.length, endIdx).trim();
			return capturedContent === apiDirectivesTable;
		}
		return false;
	} catch (error) {
		return false;
	}
}

function writeApiDirectivesTable(componentFiles, directiveFiles) {
	componentFiles.forEach((componentFile) => {
		// const componentName = componentFile.split('/').pop()
		const componentFileName = componentFile.split('/').pop().replace('.component.ts', '');
		const componentName = componentFileName.replace(/(?:^|-)([a-z])/g, (_, char) => char.toUpperCase());
		const readmeFilePath = componentFile.replace('.ts', '.md');
		const componentContent = fs.readFileSync(componentFile, 'utf8');
		const selectorMatch = componentContent.match(/@Component\({[^]*?selector: ['"]([^'"]+)['"][^]*?}\)/);
		const componentSelectorName = selectorMatch[1];
		initializeDynamicTableContent(readmeFilePath);

		if (!componentSelectorName) {
			throw new Error(`Unable to find the component name in the file ${componentFileName}`);
		}

		// const directiveRegex = new RegExp(`@Directive\\(\\s*{[^}]*selector:\\s*['"]${componentName}\\s*\\[([^'"]+)\\]`, 'g');
		const directiveRegex = /^\s*(selector):\s*(['"])(.*?)\2\s*$/gm;

		directiveFiles.forEach((directiveFile) => {
			const directiveContent = fs.readFileSync(directiveFile, 'utf8');

			let directiveNameMatch;
			while ((directiveNameMatch = directiveRegex.exec(directiveContent)) !== null) {
				if (directiveNameMatch[0].includes('@Directive({\n//')) {
					// Skip directives that are commented out
					continue;
				}
				const selectorValue = directiveNameMatch[3].split(',');
				const directiveMatch = selectorValue.find((value) => value.includes(componentSelectorName));

				if (directiveMatch) {
					const directiveName = directiveMatch.match(/\[(.*?)\]/).pop();
					const className = directiveName.replace(/(^\w{1})|(\s+\w{1})/g, (letter) => letter.toUpperCase()) + 'Directive';
					const inputRegex = new RegExp(
						`@Input\\(\\)\\s+set\\s+(${directiveName.replace(/\[/g, '\\[').replace(/\]/g, '\\]')})\\((\\w+):\\s+(\\w+)`
					);
					const inputMatch = directiveContent.match(inputRegex);
					const inputType = inputMatch && inputMatch.pop();

					if (inputType && className) {
						let finalClassName = componentName === 'Videoconference' ? className : componentName + className;
						addRowToTable(readmeFilePath, directiveName, inputType, finalClassName);
					}
				} else {
					console.log(`The selector "${componentSelectorName}" does not match with ${selectorValue}. Skipping...`);
				}
			}
		});

		if (apiTableContentIsEmpty(readmeFilePath)) {
			removeApiTableContent(readmeFilePath);
		}
	});
}

// Function to add a row to a Markdown table in a file
function addRowToTable(filePath, parameter, type, reference) {
	// Read the current content of the file
	try {
		const data = fs.readFileSync(filePath, 'utf8');

		// Define the target line and the Markdown row
		const markdownRow = `| **${parameter}** | \`${type}\` | [${reference}](../directives/${reference}.html) |`;

		// Find the line that contains the table
		const lines = data.split('\n');
		const targetIndex = lines.findIndex((line) => line.includes(endApiLine));

		if (targetIndex !== -1) {
			// Insert the new row above the target line
			lines.splice(targetIndex, 0, markdownRow);

			// Join the lines back together
			const updatedContent = lines.join('\n');

			// Write the updated content to the file
			fs.writeFileSync(filePath, updatedContent, 'utf8');
			console.log('Row added successfully.');
		} else {
			console.error('Table not found in the file.');
		}
	} catch (error) {
		console.error('Error writing to file:', error);
	}
}

function replaceDynamicTableContent(filePath, content) {
	// Read the current content of the file
	try {
		const data = fs.readFileSync(filePath, 'utf8');
		const pattern = new RegExp(`${startApiLine}([\\s\\S]*?)${endApiLine}`, 'g');

		// Replace the content between startLine and endLine with the replacement table
		const modifiedContent = data.replace(pattern, (match, capturedContent) => {
			return startApiLine + '\n' + content + '\n' + endApiLine;
		});
		// Write the modified content back to the file
		fs.writeFileSync(filePath, modifiedContent, 'utf8');
	} catch (error) {
		if (error.code === 'ENOENT') {
			console.log(`${filePath} not found! Maybe it is an internal component. Skipping...`);
		} else {
			console.error('Error writing to file:', error);
		}
	}
}

const directiveFiles = getDirectiveFiles();
const componentFiles = getComponentFiles();
const adminFiles = getAdminFiles();
writeApiDirectivesTable(componentFiles.concat(adminFiles), directiveFiles);
