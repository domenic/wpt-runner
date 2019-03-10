"use strict";

const path = require("path");
const fs = require("fs");
const recursiveReaddir = require("recursive-readdir");

async function updateTestcaseList(listFilePath, testsDirPath) {
  const resDirPath = path.join(testsDirPath, "resources");
  const ignoreFn = fp => (fp === resDirPath);
  const listedArr = (await recursiveReaddir(testsDirPath, [ignoreFn]))
    .filter(fp => (path.extname(fp) === ".html"))
    .map(fp => path.relative(testsDirPath, fp));

  let loadedJson;
  try {
    loadedJson = fs.readFileSync(listFilePath, "utf8");
  } catch (e) {
    if (e.code !== 'ENOENT') {
      throw e;
    }
    loadedJson = "{}";
  }
  const loadedMap = JSON.parse(loadedJson);

  const testcases = listedArr.reduce((testcases, fp) => {
    testcases[fp] = (loadedMap[fp] != null) ? loadedMap[fp] : true;
    return testcases;
  }, {});

  const updatedJson = JSON.stringify(testcases, null, 2);
  fs.writeFileSync(listFilePath, updatedJson, "utf8");

  return testcases;
}

exports.updateTestcaseList = updateTestcaseList;

