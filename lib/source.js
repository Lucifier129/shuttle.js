"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fromArray = exports.interval = void 0;

var _constant = require("./constant");

var _utility = require("./utility");

var interval = function interval(period) {
  return function (sink) {
    var timer;
    var i = 0;
    return (0, _utility.guard)(function (type, payload) {
      if (type === _constant.START) {
        timer = setInterval(function () {
          return sink(_constant.NEXT, i++);
        }, period);
        sink(_constant.START);
      } else if (type === _constant.FINISH) {
        clearInterval(timer);
        sink(_constant.FINISH);
      } else if (type === _constant.NEXT) {
        sink(_constant.ASYNC);
      } else {
        sink(type, payload);
      }
    });
  };
};

exports.interval = interval;

var fromArray = function fromArray(array) {
  return function (sink) {
    var i = 0;
    var callback = (0, _utility.guard)(function (type, payload) {
      if (type === _constant.NEXT) {
        if (i < array.length) {
          sink(_constant.NEXT, array[i++]);

          if (i === array.length) {
            callback(_constant.FINISH);
          }
        }
      } else if (type === _constant.FINISH) {
        sink(_constant.FINISH);
      } else {
        sink(type, payload);
      }
    });
    return callback;
  };
};

exports.fromArray = fromArray;