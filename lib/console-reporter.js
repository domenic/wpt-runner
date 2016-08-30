"use strict";
/* eslint-disable no-console */
const colors = require("colors/safe");

const INDENT_SIZE = 2;

exports.startSuite = name => console.log(`\n  ${colors.bold.underline(name)}\n`);

exports.pass = message => console.log(colors.dim(indent(colors.green("√ ") + message, INDENT_SIZE)));

exports.fail = message => console.log(colors.bold.red(indent("\u00D7 " + message, INDENT_SIZE)));

exports.reportStack = stack => console.log(colors.dim(indent(stack, INDENT_SIZE * 2)));

function indent(string, times) {
  const prefix = " ".repeat(times);
  return string.split("\n").map(l => prefix + l).join("\n");
}
