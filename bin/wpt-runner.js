#!/usr/bin/env node
"use strict";
/* eslint-disable no-console, no-process-exit */
const path = require("path");
const wptRunner = require("..");

const argv = require("yargs")
  .command("$0 <path>", "Runs the web platform tests at the given path, e.g. wpt/dom/nodes/")
  .option("root-url", {
    description: "The relative URL path for the tests at <path>, e.g. dom/nodes/",
    alias: "u",
    type: "string",
    requiresArg: true
  })
  .option("setup", {
    description: "The filename of a setup function module",
    alias: "s",
    type: "string",
    requiresArg: true
  })
  .argv;

const testsPath = argv.path;
const rootURL = argv["root-url"];
const setup = argv.setup ? require(path.resolve(argv.setup)) : () => {};

wptRunner(testsPath, { rootURL, setup })
  .then(failures => process.exit(failures))
  .catch(e => {
    console.error(e.stack);
    process.exit(1);
  });
