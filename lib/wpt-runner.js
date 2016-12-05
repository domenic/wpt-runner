"use strict";

const http = require("http");
const path = require("path");
const fs = require("fs");
const st = require("st");
const jsdom = require("jsdom");
const recursiveReaddirCb = require("recursive-readdir");
const globCb = require('glob');
const consoleReporter = require("./console-reporter.js");

const testharnessPath = path.resolve(__dirname, "../testharness.js/testharness.js");

module.exports = (testsPath, { rootURL = "/", setup = () => {}, reporter = consoleReporter, patterns } = {}) => {
  if (!rootURL.endsWith("/")) {
    rootURL += "/";
  }

  const server = setupServer(testsPath, rootURL);
  const urlPrefix = `http://127.0.0.1:${server.address().port}/` + rootURL;

  let pathsPromise;
  if (patterns) {
    const fullPatterns = [];
    for (let pattern of patterns) {
      fullPatterns.push(path.join(testsPath, pattern));
    }
    pathsPromise = globAll(fullPatterns);
  } else {
    pathsPromise = Promise.resolve([testsPath]);
  }
  return pathsPromise.then(expandDirectories).then(testFileNames => {
    const testPaths = testFileNames.filter(f => path.extname(f) === ".html")
                                   .map(fileName => path.relative(testsPath, fileName).replace(/\\/g, "/"))
                                   .sort();


    let totalFailures = 0;
    return doTest(0).then(() => totalFailures);

    function doTest(index) {
      if (index >= testPaths.length) {
        return Promise.resolve();
      }

      const testPath = testPaths[index];
      const url = urlPrefix + testPath;

      reporter.startSuite(testPath);
      return runTest(url, setup, reporter).then(success => {
        if (!success) {
          ++totalFailures;
        }

        return doTest(index + 1);
      });
    }
  });
};

function setupServer(testsPath, rootURL) {
  const staticFileServer = st({ path: testsPath, url: rootURL, passthrough: true });

  const server = http.createServer((req, res) => {
    staticFileServer(req, res, () => {
      switch (req.url) {
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
    let hasFailed = false;

    jsdom.env({
      url,
      agentOptions: {
        keepAlive: false
      },
      features: {
        FetchExternalResources: ["script", "frame", "iframe", "link"],
        ProcessExternalResources: ["script"]
      },
      virtualConsole: jsdom.createVirtualConsole().sendTo(console),
      created(err, window) {
        if (err) {
          reporter.reportStack(err.stack);
          resolve(false);
          return;
        }

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
      },

      loaded(err) {
        reporter.reportStack(err.stack);
        resolve(false);
      }
    });
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

function globAll(patterns) {
  const results = [];
  let index = 0;

  function globAllStep() {
    if (index >= patterns.length) {
      return Promise.resolve(results);
    }

    const pattern = patterns[index];
    ++index;
    return glob(pattern).then(files => {
      for (let file of files) {
        results.push(file);
      }
      return globAllStep();
    });
  }

  return globAllStep();
}

function expandDirectories(paths) {
  const results = [];
  let index = 0;

  function expandDirectoriesStep() {
    if (index >= paths.length) {
      return Promise.resolve(results);
    }

    const p = paths[index];
    ++index;
    return stat(p).then(stats => {
      if (stats.isFile()) {
        results.push(p);
        return expandDirectoriesStep();
      }

      if (stats.isDirectory()) {
        return recursiveReaddir(p).then(files => {
          for (let file of files) {
            results.push(file);
          }
          return expandDirectoriesStep();
        });
      }
    });
  }

  return expandDirectoriesStep();
}

function glob(pattern) {
  return new Promise((resolve, reject) => {
    globCb(pattern, (err, files) => {
      if (err) {
        reject(err);
      }
      resolve(files);
    });
  });
}

function stat(file) {
  return new Promise((resolve, reject) => {
    fs.stat(file, (err, stats) => {
      if (err) {
        reject(err);
      }
      resolve(stats);
    });
  });
}
