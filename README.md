# Web Platform Test Runner for Node.js

This package allows you to run tests written in the style of [web-platform-tests](https://github.com/w3c/web-platform-tests), but from within Node.js. It does this by running your tests inside a [jsdom](https://github.com/tmpvar/jsdom) instance. You can optionally run some setup code beforehand, for example to set up a polyfill that you want to test.

This is useful to a fairly narrow class of consumer: those who both

1. want to write tests in web-platform-tests format; and,
2. want to develop and test in a Node.js environment instead of a true browser.

So for example, it might be useful if you're developing a polyfill or reference implementation for a new browser feature, but want to do so in JavaScript, and get the fast no-recompile feedback loop of Node.js.

## Command-line Usage

After installing, you can do

```bash
$ wpt-runner directory-of-test-files
```

You can also pass your setup file:

```bash
$ wpt-runner directory-of-test-files setup.js
```

This will run all `.html` files found by recursively crawling the specified directory. The program's exit code will be the number of failing files encountered (`0` for success).

## Programmatic Usage

The setup is fairly similar. Here is a usage example:

```js
const wptRunner = require("wpt-runner");

wptRunner(testsPath, setup)
  .then(failures => process.exit(failures))
  .catch(e => {
    console.error(e.stack);
    process.exit(1);
  });
```

The `setup` argument is optional, and there's an optional third argument which allows passing a custom reporter instead of one that outputs to the console. (Check out `lib/console-reporter.js` for an example.) The returned promise fulfills with the number of failing files encountered (`0` for success), or rejects if there was some I/O error retrieving the files.
