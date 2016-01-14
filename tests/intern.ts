// Non-functional test suite(s) to run in each browser
export var suites:string[] = ['build/tests/unit/router', 'build/tests/unit/common/optional'];

// Functional test suite(s) to run in each browser once non-functional tests are completed
export var functionalSuites:string[] = [];

// A regular expression matching URLs to files that should not be included in code coverage analysis
export var excludeInstrumentation = /(?:node_modules|build\/tests)[\/\\]/;
export var reporters:any[] = [
    'Pretty',
    {
        id: 'node_modules/remap-istanbul/lib/intern-reporters/JsonCoverage',
        filename: 'coverage.json'
    }
];

// Browsers to run integration testing against. Note that version numbers must be strings if used with Sauce
// OnDemand. Options that will be permutated are browserName, version, platform, and platformVersion; any other
// capabilities options specified for an environment will be copied as-is
export var environments = [
    {browser: 'Chrome', os: 'Linux'},
];
//export var proxyUrl = 'http://localhost:9000/';
// A fully qualified URL to the Intern proxy
//export var proxyPort = 9000;

// Default desired capabilities for all environments. Individual capabilities can be overridden by any of the
// specified browser environments in the `environments` array below as well. See
// https://code.google.com/p/selenium/wiki/DesiredCapabilities for standard Selenium capabilities and
// https://saucelabs.com/docs/additional-config#desired-capabilities for Sauce Labs capabilities.
// Note that the `build` capability will be filled in with the current commit ID from the Travis CI environment
// automatically
// Maximum number of simultaneous integration tests that should be executed on the remote WebDriver service
export var maxConcurrency = 2;

// Name of the tunnel class to use for WebDriver tests
export var tunnel = 'NullTunnel';

