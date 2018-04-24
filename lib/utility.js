"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.log = exports.guard = void 0;

var _constant = require("./constant");

var guard = function guard(callback) {
  var isStarted = false;
  var isFinished = false;

  var guarder = function guarder(type, payload) {
    if (!isStarted && type !== _constant.START) {
      var message = "source should be started before action: ".concat(type);
      throw new Error(message);
    }

    if (isFinished) return;
    if (isStarted && type === _constant.START) return;
    if (type === _constant.START) isStarted = true;
    if (type === _constant.FINISH) isFinished = true;
    callback(type, payload);
  };

  guarder.original = callback;
  return guarder;
};

exports.guard = guard;

var log = function log(name) {
  return function (source) {
    return function (sink) {
      var callback = source(function (type, payload) {
        console.log('[forward]', name, type, payload);
        return sink(type, payload);
      });
      return function (type, payload) {
        console.log('[backward]', name, type, payload);
        return callback(type, payload);
      };
    };
  };
};

exports.log = log;