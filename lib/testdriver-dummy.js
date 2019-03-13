/* eslint-env browser */
/* eslint-disable camelcase */
"use strict";

window.test_driver = {
  bless(intent, action) {
    return Promise.resolve().then(() => {
      if (typeof action === "function") {
        return action();
      }
      return undefined;
    });
  },

  click(element) {
    if (window.top !== window) {
      return Promise.reject(new Error("can only click in top-level window"));
    }
    if (!window.document.contains(element)) {
      return Promise.reject(new Error("element in different document or shadow tree"));
    }
    return Promise.resolve();
  },

  send_keys(element) {
    if (window.top !== window) {
      return Promise.reject(new Error("can only send keys in top-level window"));
    }
    if (!window.document.contains(element)) {
      return Promise.reject(new Error("element in different document or shadow tree"));
    }
    return Promise.resolve();
  }
};
