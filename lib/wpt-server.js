"use strict";

const http = require("http");
const path = require("path");
const fs = require("fs");
const { URL } = require("url");
const st = require("st");
const { AnyHtmlHandler, WindowHandler } = require("./internal/serve.js");

const testharnessPath = path.resolve(__dirname, "../testharness/testharness.js");
const testdriverDummy = fs.readFileSync(path.resolve(__dirname, "./testdriver-dummy.js"));

module.exports = (testsPath, {
  rootURL = testsPath,
  verbose = true,
  port = 0
} = {}) => {
  if (!rootURL.startsWith("/")) {
    rootURL = "/" + rootURL;
  }
  if (!rootURL.endsWith("/")) {
    rootURL += "/";
  }

  const server = setupServer(testsPath, rootURL, port);
  const urlPrefix = `http://127.0.0.1:${server.address().port}${rootURL}`;

  if (verbose) {
    console.log(`Server running at ${urlPrefix}`);
  }

  return server;
};


function setupServer(testsPath, rootURL, port) {
  const staticFileServer = st({ path: testsPath, url: rootURL, passthrough: true });

  const routes = [
    [".window.html", new WindowHandler(testsPath, rootURL)],
    [".any.html", new AnyHtmlHandler(testsPath, rootURL)]
  ];

  const server = http.createServer((req, res) => {
    const { pathname } = new URL(req.url, `http://${req.headers.host}`);

    for (const [pathNameSuffix, handler] of routes) {
      if (pathname.endsWith(pathNameSuffix)) {
        handler.handleRequest(req, res);
        return;
      }
    }

    staticFileServer(req, res, () => {
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
          res.end("if ('__setupJSDOMReporter' in window) window.__setupJSDOMReporter();");
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
          res.end(testdriverDummy);
          break;
        }

        case "/resources/testdriver-vendor.js": {
          res.end("");
          break;
        }

        case "/favicon.ico": {
          res.writeHead(404);
          res.end("");
          break;
        }

        default: {
          throw new Error(`Unexpected URL: ${req.url}`);
        }
      }
    });
  }).listen(port);

  return server;
}
