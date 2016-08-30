#!/usr/bin/env node
"use strict";
/* eslint-disable no-console, no-process-exit */
const path = require("path");
const wptRunner = require("..");
const packageJSON = require("../package.json");

const usage = packageJSON.description + "\n\n" + packageJSON.name +
              " <tests-path> [--root-url=<url/of/tests/>] [--setup=<setup-module.js>]";

const argv = require("yargs")
  .usage(usage, {
    "root-url": {
      description: "the relative URL path for the tests, e.g. dom/nodes/",
      type: "string",
      alias: "u",
      require: false,
      requiresArg: true
    },
    setup: {
      description: "the filename of a setup function module",
      type: "string",
      alias: "s",
      require: false,
      requiresArg: true
    }
  })
  .require(1, "Missing required tests path argument")
  .addHelpOpt("help")
  .version(packageJSON.version)
  .argv;

const testsPath = argv._[0];
const rootURL = argv["root-url"];
const setup = argv.setup ? require(path.resolve(argv.setup)) : () => {};

wptRunner(testsPath, { rootURL, setup })
  .then(failures => process.exit(failures))
  .catch(e => {
    console.error(e.stack);
    process.exit(1);
  });
