"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.start = exports.toCallback = exports.observe = exports.onError = exports.onAsync = exports.onFinish = exports.onNext = exports.onStart = exports.onType = void 0;

var _constant = require("./constant");

var _utility = require("./utility");

var onType = function onType(theType) {
  return function (handler) {
    return function (source) {
      return function (sink) {
        return source(function (type, payload) {
          if (type === theType) {
            handler && handler(payload);
          }

          sink(type, payload);
        });
      };
    };
  };
};

exports.onType = onType;
var onStart = onType(_constant.START);
exports.onStart = onStart;
var onNext = onType(_constant.NEXT);
exports.onNext = onNext;
var onFinish = onType(_constant.FINISH);
exports.onFinish = onFinish;
var onAsync = onType(_constant.ASYNC);
exports.onAsync = onAsync;
var onError = onType(_constant.ERROR);
exports.onError = onError;

var observe = function observe(_ref) {
  var start = _ref.start,
      next = _ref.next,
      finish = _ref.finish,
      async = _ref.async,
      error = _ref.error;
  return function (source) {
    var _ref2, _ref3, _ref4, _ref5, _source;

    return _ref2 = (_ref3 = (_ref4 = (_ref5 = (_source = source, onStart(start)(_source)), onNext(next)(_ref5)), onFinish(finish)(_ref4)), onAsync(async)(_ref3)), onError(error)(_ref2);
  };
};

exports.observe = observe;

var toCallback = function toCallback(source) {
  var callback = source(function (type, payload) {
    if (type === _constant.START) {
      callback(_constant.NEXT);
    } else if (type === _constant.NEXT) {
      callback(_constant.NEXT);
    }
  });
  return callback;
};

exports.toCallback = toCallback;

var start = function start(source) {
  var callback = toCallback(source);
  callback(_constant.START);
  return callback;
};

exports.start = start;