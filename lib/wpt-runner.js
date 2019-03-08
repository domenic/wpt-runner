"use strict";

const http = require("http");
const path = require("path");
const fs = require("fs");
const { URL } = require("url");
const st = require("st");
const { JSDOM, VirtualConsole } = require("jsdom");
const recursiveReaddirCb = require("recursive-readdir");
const consoleReporter = require("./console-reporter.js");
const { SourceFile } = require("./internal/sourcefile.js");
const { AnyHtmlHandler, WindowHandler } = require("./internal/serve.js");

const testharnessPath = path.resolve(__dirname, "../testharness/testharness.js");

module.exports = (testsPath, {
  rootURL = "/",
  setup = () => {},
  filter = () => true,
  reporter = consoleReporter
} = {}) => {
  if (!rootURL.startsWith("/")) {
    rootURL = "/" + rootURL;
  }
  if (!rootURL.endsWith("/")) {
    rootURL += "/";
  }

  const server = setupServer(testsPath, rootURL);
  const urlPrefix = `http://127.0.0.1:${server.address().port}${rootURL}`;

  return readTestPaths(testsPath).then(testPaths => {
    let totalFailures = 0;
    return doTest(0).then(() => totalFailures);

    function doTest(index) {
      if (index >= testPaths.length) {
        return undefined;
      }

      const testPath = testPaths[index];
      const url = urlPrefix + testPath;

      return Promise.resolve(filter(testPath, url)).then(result => {
        if (result) {
          reporter.startSuite(testPath);
          return runTest(url, setup, reporter).then(success => {
            if (!success) {
              ++totalFailures;
            }
          });
        }

        return undefined;
      }).then(() => doTest(index + 1));
    }
  });
};

function setupServer(testsPath, rootURL) {
  const staticFileServer = st({ path: testsPath, url: rootURL, passthrough: true });

  const routes = [
    [".window.html", new WindowHandler(testsPath, rootURL)],
    [".any.html", new AnyHtmlHandler(testsPath, rootURL)]
  ];

  const server = http.createServer((req, res) => {
    staticFileServer(req, res, () => {
      const { pathname } = new URL(req.url, `http://${req.headers.host}`);

      for (const [pathNameSuffix, handler] of routes) {
        if (pathname.endsWith(pathNameSuffix)) {
          handler.handleRequest(req, res);
          return;
        }
      }

      switch (pathname) {
        case "/resources/testharness.js": {
          fs.createReadStream(testharnessPath).pipe(res);
          break;
        }

        case "/service-workers/service-worker/resources/test-helpers.sub.js": {
          res.end("window.service_worker_test = () => {};");
          break;
        }

        case "/resources/testharnessreport.js": {
          res.end("window.__setupJSDOMReporter();");
          break;
        }

        case "/streams/resources/test-initializer.js": {
          res.end("window.worker_test = () => {};");
          break;
        }

        case "/resources/testharness.css": {
          res.end("");
          break;
        }

        case "/resources/testdriver.js": {
          res.end(getDummyCodeOfTestDriver());
          break;
        }

        case "/resources/testdriver-vendor.js": {
          res.end("");
          break;
        }

        default: {
          throw new Error(`Unexpected URL: ${req.url}`);
        }
      }
    });
  }).listen();

  server.unref();

  return server;
}

function runTest(url, setup, reporter) {
  return new Promise(resolve => {
    const virtualConsole = new VirtualConsole()
      .sendTo(console, { omitJSDOMErrors: true })
      .on("jsdomError", e => {
        // eslint-disable-function no-console

        // Especially for a test runner, we want to surface unhandled exception stacks very directly.
        if (e.type === "unhandled exception") {
          console.error(e.detail.stack || e.detail);
        } else {
          console.error(e.stack, e.detail.stack || e.detail);
        }
      });

    JSDOM.fromURL(url, {
      resources: "usable",
      runScripts: "dangerously",
      virtualConsole
    }).then(dom => {
      let hasFailed = false;
      const { window } = dom;

      // jsdom does not have worker support; make the tests silently skip that
      window.Worker = class {};
      window.SharedWorker = class {};

      setup(window);

      /* eslint-disable no-underscore-dangle */
      window.__setupJSDOMReporter = () => {
        /* eslint-enable no-underscore-dangle */
        // jsdom does not have worker support; make the tests silently skip that

        /* eslint-disable camelcase */
        window.fetch_tests_from_worker = () => {};
        /* eslint-enable camelcase */

        window.add_result_callback(test => {
          if (test.status === 1) {
            reporter.fail(`${test.name}\n`);
            reporter.reportStack(`${test.message}\n${test.stack}`);
            hasFailed = true;
          } else if (test.status === 2) {
            reporter.fail(`${test.name} (timeout)\n`);
            reporter.reportStack(`${test.message}\n${test.stack}`);
            hasFailed = true;
          } else if (test.status === 3) {
            reporter.fail(`${test.name} (incomplete)\n`);
            reporter.reportStack(`${test.message}\n${test.stack}`);
            hasFailed = true;
          } else {
            reporter.pass(test.name);
          }
        });

        window.add_completion_callback((tests, harnessStatus) => {
          if (harnessStatus.status === 2) {
            reporter.fail("test harness should not timeout");
            resolve(false);
          }

          resolve(!hasFailed);
          window.close();
        });
      };
    }).catch(err => {
      reporter.reportStack(err.stack);
      resolve(false);
    });
  });
}

function readTestPaths(testsPath) {
  return recursiveReaddir(testsPath).then(fileNames => {
    const testFilePaths = [];
    for (const fileName of fileNames) {
      const sourceFile = new SourceFile(testsPath, path.relative(testsPath, fileName));
      testFilePaths.push(...sourceFile.testPaths());
    }
    return testFilePaths.sort();
  });
}

function recursiveReaddir(dirPath) {
  return new Promise((resolve, reject) => {
    recursiveReaddirCb(dirPath, (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
}

function getDummyCodeOfTestDriver() {
  return `
(function() {
  window.test_driver = {
    bless: function(intent, action) {
      return new Promise(resolve => {
        resolve()
      }).then(function() {
        if (typeof action === "function") {
         return action()
        }
      });
    },
    click: function(element) {
      if (window.top !== window) {
        return Promise.reject(new Error("can only click in top-level window"));
      }
      if (!window.document.contains(element)) {
        return Promise.reject(new Error("element in different document or shadow tree"));
      }
      return new Promise(function(resolve) {
        resolve();
      });
    },
    send_keys: function(element) {
      if (window.top !== window) {
        return Promise.reject(new Error("can only send keys in top-level window"));
      }
      if (!window.document.contains(element)) {
        return Promise.reject(new Error("element in different document or shadow tree"));
      }
      return new Promise(function(resolve) {
        resolve();
      });
    },
  }
}());
`;
}
