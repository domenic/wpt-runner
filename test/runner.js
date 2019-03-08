"use strict";

const wptRunner = require("..");

const testcases = require("./testcases.json");
const filter = testPath => (testcases[testPath] === true);

const path = require("path");
const testsPath = path.resolve(__dirname, "./tests/");

wptRunner(testsPath, { filter })
  .then(failure => process.exit(failure))
  .catch(e => {
    console.error(e.stack);
    process.exit(1);
  });
