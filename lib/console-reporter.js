"use strict";
/* eslint-disable no-console */
const colors = require("colors/safe");

exports.startSuite = name => console.log(colors.underline(`  ${name}\n`));

exports.pass = message => console.log(colors.dim(indent(colors.green("√ ") + message, 2)));

exports.fail = message => console.log(colors.bold.red(indent("\u00D7 " + message, 2)));

exports.reportStack = stack => console.log(colors.dim(indent(stack, 4)));

function indent(string, times) {
  const prefix = " ".repeat(times);
  return string.split("\n").map(l => prefix + l).join("\n");
}
