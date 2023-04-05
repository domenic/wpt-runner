"use strict";

// Adapted from wpt tools
// https://github.com/web-platform-tests/wpt/blob/926d722bfc83f3135aab36fddc977de82ed7e63e/tools/serve/serve.py

const assert = require("assert");
const fs = require("fs");
const { URL } = require("url");
const { filesystemPath } = require("./handlers.js");
const { jsMetaRegexp, parseVariants, readScriptMetadata, replaceEnd } = require("./sourcefile.js");

/**
 * @abstract
 */
class WrapperHandler {
  constructor(basePath, urlBase = "/") {
    this.basePath = basePath;
    this.urlBase = urlBase;
  }

  handleRequest(request, response) {
    for (const [headerName, headerValue] of this.headers()) {
      response.setHeader(headerName, headerValue);
    }

    try {
      this.checkExposure(request);
    } catch (e) {
      response.statusCode = 404;
      response.end(e.message);
      return;
    }

    try {
      const { pathname, search } = new URL(request.url, `http://${request.headers.host}`);
      const path = this.getPath(pathname, true);
      const query = search;
      const meta = [...this.getMeta(request)].join("\n");
      const script = [...this.getScript(request)].join("\n");
      const content = this.wrapper(meta, script, path, query);
      response.end(content);
      // TODO wrap_pipeline?
    } catch (e) {
      response.statusCode = 500;
      response.end(e.message);
    }
  }

  /**
   * Convert the path from an incoming request into a path corresponding to an "unwrapped"
   * resource e.g. the file on disk that will be loaded in the wrapper.
   *
   * @param path Path from the HTTP request
   * @param resourcePath Boolean used to control whether to get the path for the resource that
   *                     this wrapper will load or the associated file on disk.
   *                     Typically these are the same but may differ when there are multiple
   *                     layers of wrapping e.g. for a .any.worker.html input the underlying disk file is
   *                     .any.js but the top level html file loads a resource with a
   *                     .any.worker.js extension, which itself loads the .any.js file.
   *                     If true return the path to the resource that the wrapper will load,
   *                     otherwise return the path to the underlying file on disk.
   */
  getPath(path, resourcePath) {
    for (const item of this.pathReplace()) {
      let src, dest;
      if (item.length === 2) {
        [src, dest] = item;
      } else {
        assert.equal(item.length, 3);
        src = item[0];
        dest = item[resourcePath ? 2 : 1];
      }
      if (path.endsWith(src)) {
        path = replaceEnd(path, src, dest);
      }
    }
    return path;
  }

  /**
   * Get an iterator over script metadata based on // META comments in the
   * associated js file.
   *
   * @param request The Request being processed.
   * @returns {Iterable<[string, string]>}
   */
  * getMetadata(request) {
    const path = this.getPath(filesystemPath(this.basePath, request, this.urlBase), false);
    const f = fs.readFileSync(path, { encoding: "utf8" });
    yield* readScriptMetadata(f, jsMetaRegexp);
  }

  /**
   * Get an iterator over strings to inject into the wrapper document
   * based on // META comments in the associated js file.
   *
   * @param request The Request being processed.
   * @returns {Iterable<string>}
   */
  * getMeta(request) {
    for (const [key, value] of this.getMetadata(request)) {
      const replacement = this.metaReplacement(key, value);
      if (replacement) {
        yield replacement;
      }
    }
  }

  /**
   * Get an iterator over strings to inject into the wrapper document
   * based on // META comments in the associated js file.
   *
   * @param request The Request being processed.
   * @returns {Iterable<string>}
   */
  * getScript(request) {
    for (const [key, value] of this.getMetadata(request)) {
      const replacement = this.scriptReplacement(key, value);
      if (replacement) {
        yield replacement;
      }
    }
  }

  /**
   * @abstract
   * @returns {Array<[string, string]>}
   */
  headers() {
    return [];
  }

  /**
   * A list containing a mix of 2 item tuples with (input suffix, output suffix)
   * and 3-item tuples with (input suffix, filesystem suffix, resource suffix)
   * for the case where we want a different path in the generated resource to
   * the actual path on the filesystem (e.g. when there is another handler
   * that will wrap the file).
   *
   * @abstract
   * @returns {Array<[string, string] | [string, string, string]>}
   */
  pathReplace() {
    throw new Error("Not implemented");
  }

  /**
   * String template with variables path and meta for wrapper document
   *
   * @abstract
   * @param {string} meta
   * @param {string} script
   * @param {string} path
   * @param {string} query
   * @returns {string}
   */
  wrapper(meta, script, path, query) { // eslint-disable-line no-unused-vars
    throw new Error("Not implemented");
  }

  /**
   * Get the string to insert into the wrapper document, given
   * a specific metadata key: value pair.
   *
   * @abstract
   * @param {string} key
   * @param {string} value
   * @returns {string}
   */
  metaReplacement(key, value) { // eslint-disable-line no-unused-vars
    return "";
  }

  /**
   * Get the string to insert into the wrapper document, given
   * a specific metadata key: value pair.
   *
   * @abstract
   * @param {string} key
   * @param {string} value
   * @returns {string}
   */
  scriptReplacement(key, value) { // eslint-disable-line no-unused-vars
    return "";
  }

  /**
   * Raise an exception if this handler shouldn't be exposed after all.
   *
   * @abstract
   * @param request
   * @returns {void}
   */
  checkExposure(request) { // eslint-disable-line no-unused-vars
    // do nothing
  }
}

/**
 * @abstract
 */
class HtmlWrapperHandler extends WrapperHandler {
  /**
   * @abstract
   * @returns {string}
   */
  globalType() {
    return "";
  }

  checkExposure(request) {
    const globalType = this.globalType();
    if (globalType) {
      let globals = "";
      for (const [key, value] of this.getMetadata(request)) {
        if (key === "global") {
          globals = value;
        }
      }
      if (!parseVariants(globals).has(globalType)) {
        throw new Error(`This test cannot be loaded in ${globalType} mode`);
      }
    }
  }

  headers() {
    return [["Content-Type", "text/html"]];
  }

  metaReplacement(key, value) {
    if (key === "timeout") {
      if (value === "long") {
        return `<meta name="timeout" content="${value}">`;
      }
    }
    if (key === "title") {
      value = value.replace("&", "&amp;").replace("<", "&lt;");
      return `<title>${value}</title>`;
    }
    return "";
  }

  scriptReplacement(key, value) {
    if (key === "script") {
      const attribute = value.replace("&", "&amp;").replace("\"", "&quot;");
      return `<script src="${attribute}"></script>`;
    }
    return "";
  }
}

class WindowHandler extends HtmlWrapperHandler {
  pathReplace() {
    return [[".window.html", ".window.js"]];
  }

  wrapper(meta, script, path) {
    return `<!doctype html>
<meta charset=utf-8>
${meta}
<script src="/resources/testharness.js"></script>
<script src="/resources/testharnessreport.js"></script>
${script}
<div id=log></div>
<script src="${path}"></script>
`;
  }
}

class AnyHtmlHandler extends HtmlWrapperHandler {
  pathReplace() {
    return [[".any.html", ".any.js"]];
  }

  wrapper(meta, script, path) {
    return `<!doctype html>
<meta charset=utf-8>
${meta}
<script>
self.GLOBAL = {
  isWindow: function() { return true; },
  isWorker: function() { return false; },
};
</script>
<script src="/resources/testharness.js"></script>
<script src="/resources/testharnessreport.js"></script>
${script}
<div id=log></div>
<script src="${path}"></script>
`;
  }
}

exports.WindowHandler = WindowHandler;
exports.AnyHtmlHandler = AnyHtmlHandler;
