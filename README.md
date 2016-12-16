# Web Platform Test Runner for Node.js

This package allows you to run tests written in the style of [web-platform-tests](https://github.com/w3c/web-platform-tests), but from within Node.js. It does this by running your tests inside a [jsdom](https://github.com/tmpvar/jsdom) instance. You can optionally run some setup code beforehand, for example to set up a polyfill that you want to test.

This is useful to a fairly narrow class of consumer: those who both

1. want to write tests in web-platform-tests format; and,
2. want to develop and test in a Node.js environment instead of a true browser.

So for example, it might be useful if you're developing a polyfill or reference implementation for a new browser feature, but want to do so in JavaScript, and get the fast no-recompile feedback loop of Node.js.

## Command-line Usage

```
$ node bin/wpt-runner.js
Runs web platform tests in Node.js using jsdom

wpt-runner <tests-path> [--root-url=<url/of/tests/>] [--setup=<setup-module.js>]

Options:
  --root-url, -u  the relative URL path for the tests, e.g. dom/nodes/  [string]
  --setup, -s     the filename of a setup function module               [string]
  --help          Show help                                            [boolean]
  --version       Show version number                                  [boolean]
```

This will run all `.html` files found by recursively crawling the specified directory, optionally mounted to the specified root URL and using the specified setup function. The program's exit code will be the number of failing files encountered (`0` for success).

## Programmatic Usage

The setup is fairly similar. Here is a usage example:

```js
const wptRunner = require("wpt-runner");

wptRunner(testsPath, { rootURL, setup, filter, reporter })
  .then(failures => process.exit(failures))
  .catch(e => {
    console.error(e.stack);
    process.exit(1);
  });
```

The options are:

- `rootURL`: the URL at which to mount the tests (so that they resolve any relative URLs correctly).
- `setup`: a setup function to run in the jsdom environment before running the tests.
- `filter`: a function that takes the arguments `testPath` and `testURL` and returns true or false (or a promise for one of those) to indicate whether the test should run. Defaults to no filtering
- `reporter`: an object which can be used to customize the output reports, instead of the default of reporting to the console. (Check out `lib/console-reporter.js` for an example of the object structure.)

The returned promise fulfills with the number of failing files encountered (`0` for success), or rejects if there was some I/O error retrieving the files.
