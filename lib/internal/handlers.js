"use strict";

// Adapted from wpt tools
// https://github.com/web-platform-tests/wpt/blob/master/tools/wptserve/wptserve/handlers.py

const path = require("path");
const { URL } = require("url");

function filesystemPath(basePath, request, urlBase = "/") {
  const { pathname } = new URL(request.url, `http://${request.headers.host}`);
  let p = decodeURIComponent(pathname);

  if (p.startsWith(urlBase)) {
    p = p.slice(urlBase.length);
  }

  if (p.includes("..")) {
    throw new Error("invalid path");
  }

  p = path.join(basePath, p);

  // Otherwise setting path to / allows access outside the root directory
  if (!p.startsWith(basePath)) {
    throw new Error("invalid path");
  }

  return p;
}

exports.filesystemPath = filesystemPath;
