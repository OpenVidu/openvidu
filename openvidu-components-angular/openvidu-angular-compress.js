const glob = require('glob');
const { readFileSync, writeFileSync } = require('fs');
const { minify } = require('uglify-js');

const options = {
	mangle: true,
	compress: true,
	toplevel: false,
	output: {
		comments: false
	}
};

glob('dist/openvidu-angular/**/*.mjs', {}, function (er, files) {
	files.forEach(function (file) {
		const code = readFileSync(file, 'utf8');
		const result = minify(code, options);
		writeFileSync(file, result.code, 'utf8');
	});
});
