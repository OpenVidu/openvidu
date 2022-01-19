// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage-istanbul-reporter'),
      require('@angular-devkit/build-angular/plugins/karma')
    ],
    client: {
      clearContext: false // leave Jasmine Spec Runner output visible in browser
    },
    customLaunchers: {
			ChromeHeadless: {
				base: 'Chrome',
				flags: [
					'--headless',
					'--disable-gpu',
					'--disable-translate',
					'--disable-extensions',
					// Without a remote debugging port, Google Chrome exits immediately.
					'--no-sandbox',
					'--remote-debugging-port=9222',
					'--js-flags="--max_old_space_size=4096"'
				]
			},
      Chrome: {
        base: 'Chrome',
				flags: [
					'--disable-gpu',
					'--disable-translate',
					'--disable-extensions',
					// Without a remote debugging port, Google Chrome exits immediately.
					'--no-sandbox',
					'--remote-debugging-port=9222',
					'--js-flags="--max_old_space_size=4096"'
				]
      }
		},
    coverageIstanbulReporter: {
			dir: require('path').join(__dirname, '../coverage'),
			reports: ['html', 'lcovonly', 'text-summary'],
			fixWebpackSourcePaths: true,
			verbose: true,
			thresholds: {
				emitWarning: false,
				global: {
					statements: 80,
					branches: 80,
					functions: 80,
					lines: 80
				},
				each: {
					statements: 80,
					branches: 80,
					functions: 80,
					lines: 80
				}
			}
		},
    reporters: ['progress', 'kjhtml'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['ChromeHeadless'],
    singleRun: false,
    restartOnFileChange: true
  });
};
