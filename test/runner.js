"use strict";

const path = require("path");
const wptRunner = require("..");
const { updateTestcaseList } = require("./util");

const listFilePath = path.join(__dirname, "./testcases.json");
const testsDirPath = path.join(__dirname, "./tests/");

(async () => {

  const testcases = await updateTestcaseList(listFilePath, testsDirPath);
  const filter = htmlPath => (testcases[htmlPath] === true);

  wptRunner(testsDirPath, { filter })
    .then(failure => process.exit(failure))
    .catch(e => {
      console.error(e.stack);
      process.exit(1);
    });

})();
