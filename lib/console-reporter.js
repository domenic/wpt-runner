"use strict";
const { styleText } = require("node:util");

const INDENT_SIZE = 2;

exports.startSuite = name => console.log(`\n  ${styleText(["bold", "underline"], name)}\n`);

exports.pass = message => console.log(
  indent(
    styleText("dim", styleText("green", "√ ") + message),
    INDENT_SIZE
  )
);

exports.fail = message => console.log(
  indent(
    styleText(["bold", "red"], `\u00D7 ${message}`),
    INDENT_SIZE
  )
);

exports.reportStack = stack => console.log(
  indent(
    styleText("dim", stack),
    INDENT_SIZE * 2
  )
);

function indent(string, times) {
  const prefix = " ".repeat(times);
  return string.split("\n").map(l => prefix + l).join("\n");
}
