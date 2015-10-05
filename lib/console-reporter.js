"use strict";

exports.startSuite = name => console.log(`# ${name}\n`);

exports.pass = message => console.log(indent("\u221A " + message, 2));

exports.fail = message => console.log(indent("\u00D7 " + message, 2));

exports.reportStack = stack => console.log(indent(stack, 4));

function indent(string, times) {
  const prefix = " ".repeat(times);
  return string.split("\n").map(l => prefix + l).join("\n");
}
