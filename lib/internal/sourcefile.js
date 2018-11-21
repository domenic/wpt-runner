"use strict";

// Adapted from wpt tools
// https://github.com/web-platform-tests/wpt/blob/926d722bfc83f3135aab36fddc977de82ed7e63e/tools/manifest/sourcefile.py

const assert = require("assert");
const fs = require("fs");
const path = require("path");

/**
 * Given a string `s` that ends with `oldSuffix`, replace that occurrence of `oldSuffix`
 * with `newSuffix`.
 */
function replaceEnd(s, oldSuffix, newSuffix) {
  assert.ok(s.endsWith(oldSuffix));
  return s.slice(0, s.length - oldSuffix.length) + newSuffix;
}

const jsMetaRegexp = /\/\/\s*META:\s*(\w*)=(.*)$/;

/**
 * Yields any metadata (pairs of strings) from the multi-line string `s`,
 * as specified according to a supplied regexp.
 *
 * @param s
 * @param regexp Regexp containing two groups containing the metadata name and value.
 * @returns {Iterable<[string, string]>}
 */
function* readScriptMetadata(s, regexp) {
  for (const line of s.split("\n")) {
    const m = line.match(regexp);
    if (!m) {
      break;
    }
    yield [m[1], m[2]];
  }
}

const anyVariants = {
  // Worker tests are not supported yet, so we remove all worker variants
  default: {
    longhand: ["window"]
  },
  window: {
    suffix: ".any.html"
  },
  jsshell: {
    suffix: ".any.js"
  }
};

/**
 * Returns a set of variants (strings) defined by the given keyword.
 *
 * @returns {Set<string>}
 */
function getAnyVariants(item) {
  assert.equal(item.startsWith("!"), false);

  const variant = anyVariants[item];
  if (!variant) {
    return new Set([]);
  }
  return new Set(variant.longhand || [item]);
}

/**
 * Returns a set of variants (strings) that will be used by default.
 *
 * @returns {Set<string>}
 */
function getDefaultAnyVariants() {
  return new Set(anyVariants.default.longhand);
}

/**
 * Returns a set of variants (strings) defined by a comma-separated value.
 *
 * @returns {Set<string>}
 */
function parseVariants(value) {
  const globals = getDefaultAnyVariants();
  for (let item of value.split(",")) {
    item = item.trim();
    if (item.startsWith("!")) {
      for (const variant of getAnyVariants(item.slice(1))) {
        globals.delete(variant);
      }
    } else {
      for (const variant of getAnyVariants(item)) {
        globals.add(variant);
      }
    }
  }
  return globals;
}

/**
 * Yields tuples of the relevant filename suffix (a string) and whether the
 * variant is intended to run in a JS shell, for the variants defined by the
 * given comma-separated value.
 *
 * @param {string} value
 * @returns {Array<[string, boolean]>}
 */
function globalSuffixes(value) {
  const rv = [];

  const globalTypes = parseVariants(value);
  for (const globalType of globalTypes) {
    const variant = anyVariants[globalType];
    const suffix = variant.suffix || `.any.${globalType}.html`;
    rv.push([suffix, globalType === "jsshell"]);
  }

  return rv;
}

/**
 * Returns a url created from the given url and suffix.
 *
 * @param {string} url
 * @param {string} suffix
 * @returns {string}
 */
function globalVariantUrl(url, suffix) {
  url = url.replace(".any.", ".");
  // If the url must be loaded over https, ensure that it will have
  // the form .https.any.js
  if (url.includes(".https.") && suffix.startsWith(".https.")) {
    url = url.replace(".https.", ".");
  }
  return replaceEnd(url, ".js", suffix);
}

class SourceFile {
  constructor(testsRoot, relPath) {
    this.testsRoot = testsRoot;
    this.relPath = relPath.replace(/\\/g, "/");
    this.contents = undefined;

    this.filename = path.basename(this.relPath);
    this.ext = path.extname(this.filename);
    this.name = this.filename.slice(0, this.filename.length - this.ext.length);

    this.metaFlags = this.name.split(".").slice(1);
  }

  open() {
    if (this.contents === undefined) {
      this.contents = fs.readFileSync(this.path(), { encoding: "utf8" });
    }
    return this.contents;
  }

  path() {
    return path.join(this.testsRoot, this.relPath);
  }

  nameIsMultiGlobal() {
    return this.metaFlags.includes("any") && this.ext === ".js";
  }

  nameIsWorker() {
    return this.metaFlags.includes("worker") && this.ext === ".js";
  }

  nameIsWindow() {
    return this.metaFlags.includes("window") && this.ext === ".js";
  }

  contentIsTestharness() {
    // TODO Parse the HTML and look for <script src="/resources/testharness.js">
    return this.ext === ".html" || this.ext === ".xhtml";
  }

  scriptMetadata() {
    let regexp;
    if (this.nameIsWorker() || this.nameIsMultiGlobal() || this.nameIsWindow()) {
      regexp = jsMetaRegexp;
    } else {
      return [];
    }
    return readScriptMetadata(this.open(), regexp);
  }

  // adapted from SourceFile#manifest_items
  testPaths() {
    const paths = [];
    if (this.nameIsMultiGlobal()) {
      let globals = "";
      for (const [key, value] of this.scriptMetadata()) {
        if (key === "global") {
          globals = value;
          break;
        }
      }
      for (const [suffix] of globalSuffixes(globals)) {
        paths.push(globalVariantUrl(this.relPath, suffix));
      }
    } else if (this.nameIsWorker()) {
      // Worker tests are not yet supported
    } else if (this.nameIsWindow()) {
      const testPath = replaceEnd(this.relPath, ".window.js", ".window.html");
      paths.push(testPath);
    } else if (this.contentIsTestharness()) {
      const testPath = this.relPath;
      paths.push(testPath);
    }
    return paths;
  }
}

exports.replaceEnd = replaceEnd;
exports.jsMetaRegexp = jsMetaRegexp;
exports.readScriptMetadata = readScriptMetadata;
exports.parseVariants = parseVariants;
exports.SourceFile = SourceFile;
