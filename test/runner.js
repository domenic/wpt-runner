"use strict";

const path = require("path");
const wptRunner = require("..");

const testsDirPath = path.join(__dirname, "./tests/");

wptRunner(testsDirPath)
  .then(failure => process.exit(failure))
  .catch(e => {
    console.error(e.stack);
    process.exit(1);
  });
