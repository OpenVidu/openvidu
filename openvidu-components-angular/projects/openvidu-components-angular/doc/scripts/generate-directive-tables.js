const fs = require('fs');
const glob = require('glob');

const startApiLine = '<!-- start-dynamic-api-directives-content -->';
const apiDirectivesTable =
    '| **Parameter** | **Type** | **Reference** | \n' +
    '|:--------------------------------: | :-------: | :---------------------------------------------: |';
const endApiLine = '<!-- end-dynamic-api-directives-content -->';

/**
 * Get all directive files from the API directives directory
 */
function getDirectiveFiles() {
    const directivesDir = 'projects/openvidu-components-angular/src/lib/directives/api';
    return listFiles(directivesDir, '.directive.ts');
}

/**
 * Get all component files
 */
function getComponentFiles() {
    const componentsDir = 'projects/openvidu-components-angular/src/lib/components';
    return listFiles(componentsDir, '.component.ts');
}

/**
 * Get all admin files
 */
function getAdminFiles() {
    const componentsDir = 'projects/openvidu-components-angular/src/lib/admin';
    return listFiles(componentsDir, '.component.ts');
}

/**
 * List all files with specific extension in directory
 */
function listFiles(directoryPath, fileExtension) {
    const files = glob.sync(`${directoryPath}/**/*${fileExtension}`);
    if (files.length === 0) {
        throw new Error(`No ${fileExtension} files found in ${directoryPath}`);
    }
    return files;
}

/**
 * Extract component selector from component file
 */
function getComponentSelector(componentFile) {
    const componentContent = fs.readFileSync(componentFile, 'utf8');
    const selectorMatch = componentContent.match(/@Component\({[^]*?selector:\s*['"]([^'"]+)['"][^]*?}\)/s);

    if (!selectorMatch) {
        throw new Error(`Unable to find selector in component file: ${componentFile}`);
    }

    return selectorMatch[1];
}

/**
 * Check if a directive class has @internal annotation
 */
function isInternalDirective(directiveContent, className) {
    const classRegex = new RegExp(`(/\\*\\*[\\s\\S]*?\\*/)?\\s*@Directive\\([\\s\\S]*?\\)\\s*export\\s+class\\s+${escapeRegex(className)}`, 'g');
    const match = classRegex.exec(directiveContent);

    if (match && match[1]) {
        return match[1].includes('@internal');
    }

    return false;
}

/**
 * Extract attribute name from selector for a specific component
 */
function extractAttributeForComponent(selector, componentSelector) {
    // Split selector by comma and trim whitespace
    const selectorParts = selector.split(',').map(part => part.trim());

    // Find the part that matches our component
    for (const part of selectorParts) {
        if (part.includes(componentSelector)) {
            // Extract attribute from this specific part
            const attributeMatch = part.match(/\[([^\]]+)\]/);
            if (attributeMatch) {
                return attributeMatch[1];
            }
        }
    }

    // Fallback: if no specific match, return the first attribute found
    const fallbackMatch = selector.match(/\[([^\]]+)\]/);
    return fallbackMatch ? fallbackMatch[1] : null;
}

/**
 * Extract all directive classes from a directive file
 */
function extractDirectiveClasses(directiveContent) {
    const classes = [];

    // Regex to find all directive class definitions with their preceding @Directive decorators
    const directiveClassRegex = /@Directive\(\s*{\s*selector:\s*['"]([^'"]+)['"][^}]*}\s*\)\s*export\s+class\s+(\w+)/gs;

    let match;
    while ((match = directiveClassRegex.exec(directiveContent)) !== null) {
        const selector = match[1];
        const className = match[2];

        // Skip internal directives
        if (isInternalDirective(directiveContent, className)) {
            console.log(`Skipping internal directive: ${className}`);
            continue;
        }

        classes.push({
            selector,
            className
        });
    }

    return classes;
}

/**
 * Extract all directives from a directive file that match a component selector
 */
function extractDirectivesForComponent(directiveFile, componentSelector) {
    const directiveContent = fs.readFileSync(directiveFile, 'utf8');
    const directives = [];

    // Get all directive classes in the file (excluding internal ones)
    const directiveClasses = extractDirectiveClasses(directiveContent);

    // Filter classes that match the component selector
    const matchingClasses = directiveClasses.filter(directiveClass =>
        directiveClass.selector.includes(componentSelector)
    );

    // For each matching class, extract input type information
    matchingClasses.forEach(directiveClass => {
        // Extract the correct attribute name for this component
        const attributeName = extractAttributeForComponent(directiveClass.selector, componentSelector);

        if (attributeName) {
            const inputInfo = extractInputInfo(directiveContent, attributeName, directiveClass.className);

            if (inputInfo) {
                directives.push({
                    attribute: attributeName,
                    type: inputInfo.type,
                    className: directiveClass.className
                });
            }
        }
    });

    return directives;
}

/**
 * Extract input information (type) for a specific attribute and class
 */
function extractInputInfo(directiveContent, attributeName, className) {
    // Create a regex to find the specific class section
    const classRegex = new RegExp(`export\\s+class\\s+${escapeRegex(className)}[^}]*?{([^]*?)(?=export\\s+class|$)`, 's');
    const classMatch = directiveContent.match(classRegex);

    if (!classMatch) {
        console.warn(`Could not find class ${className}`);
        return null;
    }

    const classContent = classMatch[1];

    // Regex to find the @Input setter for this attribute within the class
    const inputRegex = new RegExp(
        `@Input\\(\\)\\s+set\\s+${escapeRegex(attributeName)}\\s*\\(\\s*\\w+:\\s*([^)]+)\\s*\\)`,
        'g'
    );

    const inputMatch = inputRegex.exec(classContent);
    if (!inputMatch) {
        console.warn(`Could not find @Input setter for attribute: ${attributeName} in class: ${className}`);
        return null;
    }

    let type = inputMatch[1].trim();

    // Clean up the type (remove extra whitespace, etc.)
    type = type.replace(/\s+/g, ' ');

    return {
        type: type
    };
}

/**
 * Escape special regex characters
 */
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Generate API directives table for components
 */
function generateApiDirectivesTable(componentFiles, directiveFiles) {
    componentFiles.forEach((componentFile) => {
        try {
            console.log(`Processing component: ${componentFile}`);

            const componentSelector = getComponentSelector(componentFile);
            const readmeFilePath = componentFile.replace('.ts', '.md');

            console.log(`Component selector: ${componentSelector}`);

            // Initialize table with header
            initializeDynamicTableContent(readmeFilePath);

            const allDirectives = [];

            // Extract directives from all directive files
            directiveFiles.forEach((directiveFile) => {
                console.log(`Checking directive file: ${directiveFile}`);
                const directives = extractDirectivesForComponent(directiveFile, componentSelector);
                allDirectives.push(...directives);
            });

            console.log(`Found ${allDirectives.length} directives for ${componentSelector}`);

            // Sort directives alphabetically by attribute name
            allDirectives.sort((a, b) => a.attribute.localeCompare(b.attribute));

            // Add rows to table
            allDirectives.forEach((directive) => {
                addRowToTable(readmeFilePath, directive.attribute, directive.type, directive.className);
            });

            // If no directives found, add "no directives" message
            if (allDirectives.length === 0) {
                removeApiTableContent(readmeFilePath);
            }

        } catch (error) {
            console.error(`Error processing component ${componentFile}:`, error.message);
        }
    });
}

/**
 * Initialize table with header
 */
function initializeDynamicTableContent(filePath) {
    replaceDynamicTableContent(filePath, apiDirectivesTable);
}

/**
 * Replace table content with "no directives" message
 */
function removeApiTableContent(filePath) {
    const content = '_No API directives available for this component_. \n';
    replaceDynamicTableContent(filePath, content);
}

/**
 * Add a row to the markdown table
 */
function addRowToTable(filePath, parameter, type, reference) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        const markdownRow = `| **${parameter}** | \`${type}\` | [${reference}](../directives/${reference}.html) |`;

        const lines = data.split('\n');
        const targetIndex = lines.findIndex((line) => line.includes(endApiLine));

        if (targetIndex !== -1) {
            lines.splice(targetIndex, 0, markdownRow);
            const updatedContent = lines.join('\n');
            fs.writeFileSync(filePath, updatedContent, 'utf8');
            console.log(`Added directive: ${parameter} -> ${reference}`);
        } else {
            console.error('End marker not found in file:', filePath);
        }
    } catch (error) {
        console.error('Error adding row to table:', error);
    }
}

/**
 * Replace content between start and end markers
 */
function replaceDynamicTableContent(filePath, content) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        const pattern = new RegExp(`${startApiLine}([\\s\\S]*?)${endApiLine}`, 'g');

        const modifiedContent = data.replace(pattern, (match, capturedContent) => {
            return startApiLine + '\n' + content + '\n' + endApiLine;
        });

        fs.writeFileSync(filePath, modifiedContent, 'utf8');
        console.log(`Updated table content in: ${filePath}`);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log(`${filePath} not found! Maybe it is an internal component. Skipping...`);
        } else {
            console.error('Error writing to file:', error);
        }
    }
}

// Main execution
if (require.main === module) {
    try {
        const directiveFiles = getDirectiveFiles();
        const componentFiles = getComponentFiles();
        const adminFiles = getAdminFiles();

        console.log('Starting directive table generation...');
        generateApiDirectivesTable(componentFiles.concat(adminFiles), directiveFiles);
        console.log('Directive table generation completed!');

    } catch (error) {
        console.error('Script execution failed:', error);
        process.exit(1);
    }
}

// Export functions for testing
module.exports = {
    generateApiDirectivesTable,
    getDirectiveFiles,
    getComponentFiles,
    getAdminFiles
};