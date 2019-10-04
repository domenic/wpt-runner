#!/usr/bin/env node
"use strict";

const wptServer = require("../lib/wpt-server");

const argv = require("yargs")
  .command("$0 <path>", "Serves the web platform tests at the given path, e.g. wpt/dom/nodes/")
  .option("root-url", {
    description: "The relative URL path for the tests at <path>, e.g. dom/nodes/",
    alias: "u",
    type: "string",
    requiresArg: true
  })
  .option("port", {
    description: "The port number on which to run the server, e.g. 8000",
    alias: "p",
    type: "number",
    requiresArg: true
  })
  .argv;

const testsPath = argv.path;
const rootURL = argv["root-url"];
const port = argv.port || 0;

wptServer(testsPath, { rootURL, port });
