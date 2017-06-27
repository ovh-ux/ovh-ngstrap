// Karma configuration
// http://karma-runner.github.io/0.10/config/configuration-file.html

module.exports = function (config) {
    config.set({
        // base path, that will be used to resolve files and exclude
        basePath: "",

        // testing framework to use (jasmine/mocha/qunit/...)
        frameworks: ["jasmine"],

        // list of files / patterns to load in the browser
        files: [
            "bower_components/jquery/dist/jquery.js",
            "bower_components/lodash/lodash.js",
            "bower_components/angular/angular.js",
            "bower_components/angular-sanitize/angular-sanitize.js",
            "bower_components/angular-mocks/angular-mocks.js",
            "src/helpers/ovh-ngstrap-helpers-compiler.module.js",
            "src/helpers/ovh-ngstrap-helpers-dimensions.module.js",
            "src/popover/ovh-ngstrap-popover.module.js",
            "src/tooltip/ovh-ngstrap-tooltip.module.js",
            "src/ovh-ngstrap.js",
            "src/**/*.js"
        ],

        // list of files / patterns to exclude
        exclude: [],

        // web server port
        port: 8081,

        // level of logging
        // possible values: LOG_DISABLE || LOG_ERROR || LOG_WARN || LOG_INFO || LOG_DEBUG
        logLevel: config.LOG_INFO,

        // enable / disable watching file and executing tests whenever any file changes
        autoWatch: false,

        // Start these browsers, currently available:
        // - Chrome
        // - ChromeCanary
        // - Firefox
        // - Opera
        // - Safari (only Mac)
        // - PhantomJS
        // - IE (only Windows)
        browsers: ["PhantomJS"],

        // Continuous Integration mode
        // if true, it capture browsers, run tests and exit
        singleRun: false
    });
};
