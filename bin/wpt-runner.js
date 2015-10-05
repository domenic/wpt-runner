#!/usr/bin/env node
"use strict";
const path = require("path");
const wptRunner = require("../lib/wpt-runner.js");

const testsPath = process.argv[2];
const setup = require(path.resolve(process.argv[3]));
wptRunner(testsPath, setup);


// TODO: failures need to contribute to exit code.
