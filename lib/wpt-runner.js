"use strict";

const http = require("http");
const path = require("path");
const fs = require("fs");
const st = require("st");
const url = require("url");
const jsdom = require("jsdom");
const recursiveReaddir = require("recursive-readdir");

const testharnessPath = path.resolve(__dirname, "../testharness.js/testharness.js");

module.exports = (testsPath, reporter) => {
  const server = setupServer(testsPath);
  const urlPrefix = `http://127.0.0.1:${server.address().port}/`;

  recursiveReaddir(testsPath, (err, testFileNames) => {
    if (err) {
      reporter.fail(`Failed to read tests from ${testsPath}`);
      reporter.reportStack(err.stack);
      return;
    }

    testFileNames.filter(f => path.extname(f) === ".html").sort().forEach(fileName => {
      const testPath = path.relative(testsPath, fileName).replace(/\\/g, "/");
      reporter.startSuite(testPath);
      createJsdom(urlPrefix, testPath, reporter);
    });
  });

  return server;
};

function setupServer(testsPath) {
  const staticFileServer = st({ path: testsPath, url: "/", passthrough: true });

  const server = http.createServer((req, res) => {
    staticFileServer(req, res, () => {
      switch (req.url) {
        case "/resources/testharness.js": {
          fs.createReadStream(testharnessPath).pipe(res);
          break;
        }

        case "/service-workers/service-workers/resources/test-helpers.js": {
          res.end("window.service_worker_test = () => {};");
          break;
        }

        case "/resources/testharnessreport.js": {
          res.end("window.__setupJSDOMReporter();");
          break;
        }

        case "/resources/testharness.css": {
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

function createJsdom(urlPrefix, testPath, reporter) {
  jsdom.env({
    url: urlPrefix + testPath,
    features: {
      FetchExternalResources: ["script", "frame", "iframe", "link"],
      ProcessExternalResources: ["script"]
    },
    virtualConsole: jsdom.createVirtualConsole().sendTo(console),
    created(err, window) {
      if (err) {
        reporter.reportStack(err.stack);
        return;
      }

      // TODO here is where we insert our implementations of things

      // jsdom does not have worker support; make the tests silently skip that
      window.Worker = class {};
      window.SharedWorker = class {};

      window.__setupJSDOMReporter = () => {
        // jsdom does not have worker support; make the tests silently skip that
        window.fetch_tests_from_worker = () => {};

        window.add_result_callback(test => {
          if (test.status === 1) {
            reporter.fail(`${test.name}\n`);
            reporter.reportStack(`${test.message}\n${test.stack}`);
          } else if (test.status === 2) {
            reporter.fail(`${test.name} (timeout)\n`);
            reporter.reportStack(`${test.message}\n${test.stack}`);
          } else {
            reporter.pass(test.name);
          }
        });

        window.add_completion_callback((tests, harnessStatus) => {
          if (harnessStatus.status === 2) {
            reporter.fail("test harness should not timeout");
          }
          window.close();
        });
      };
    },

    loaded(err) {
      reporter.reportStack(err.stack);
    }
  });
}
