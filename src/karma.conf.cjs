const { join } = require('path');
const jasmine = require('karma-jasmine');
const chromeLauncher = require('karma-chrome-launcher');
const jasmineHtmlReporter = require('karma-jasmine-html-reporter');
const coverageIstanbulReporter = require('karma-coverage-istanbul-reporter');
const angularPlugins = require('@angular-devkit/build-angular/plugins/karma');

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      jasmine,
      chromeLauncher,
      jasmineHtmlReporter,
      coverageIstanbulReporter,
      angularPlugins
    ],
    client: {
      clearContext: false // leave Jasmine Spec Runner output visible in browser
    },
    coverageIstanbulReporter: {
      dir: join(__dirname, '../coverage/client'),
      reports: ['html', 'lcovonly', 'text-summary'],
      fixWebpackSourcePaths: true
    },
    reporters: ['progress', 'kjhtml'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['Chrome'],
    singleRun: false,
    restartOnFileChange: true
  });
};
