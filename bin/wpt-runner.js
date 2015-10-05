#!/usr/bin/env node
"use strict";
const path = require("path");
const wptRunner = require("../lib/wpt-runner.js");
const consoleReporter = require("../lib/console-reporter.js");

wptRunner(path.resolve(process.argv[2]), consoleReporter);


// TODO: failures need to contribute to exit code.
