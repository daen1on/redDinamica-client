import { join } from 'path';
import { config } from 'karma';
import jasmine from 'karma-jasmine';
import chromeLauncher from 'karma-chrome-launcher';
import jasmineHtmlReporter from 'karma-jasmine-html-reporter';
import coverageIstanbulReporter from 'karma-coverage-istanbul-reporter';
import angularPlugins from '@angular-devkit/build-angular/plugins/karma';

export default function (config) {
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
