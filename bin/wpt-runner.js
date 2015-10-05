#!/usr/bin/env node
"use strict";
const path = require("path");
const wptRunner = require("../lib/wpt-runner.js");
const consoleReporter = require("../lib/console-reporter.js");

const server = wptRunner(path.resolve(process.argv[2]), consoleReporter);

// Don't keep the server alive.
server.unref();
process.on("exit", () => server.close());


// TODO: failures need to contribute to exit code.
