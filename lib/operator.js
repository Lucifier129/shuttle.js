"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.switchMap = exports.takeUntil = exports.share = exports.concat = exports.take = exports.filter = exports.map = void 0;

var _constant = require("./constant");

var _utility = require("./utility");

var map = function map(f) {
  return function (source) {
    return function (sink) {
      return source(function (type, payload) {
        sink(type, type === _constant.NEXT ? f(payload) : payload);
      });
    };
  };
};

exports.map = map;

var filter = function filter(f) {
  return function (source) {
    return function (sink) {
      var callback = source(function (type, payload) {
        if (type === _constant.NEXT) {
          if (f(payload)) {
            sink(_constant.NEXT, payload);
          } else {
            callback(_constant.NEXT);
          }
        } else {
          sink(type, payload);
        }
      });
      return callback;
    };
  };
};

exports.filter = filter;

var take = function take(max) {
  return function (source) {
    return function (sink) {
      var count = 0;
      var callback = source(function (type, payload) {
        if (type === _constant.NEXT) {
          if (count < max) {
            count += 1;
            sink(_constant.NEXT, payload);

            if (count === max) {
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
};

exports.take = take;

var concat = function concat() {
  for (var _len = arguments.length, sourceList = new Array(_len), _key = 0; _key < _len; _key++) {
    sourceList[_key] = arguments[_key];
  }

  return function (sink) {
    var index = 0;
    var loopCallback = null;
    var isStarted = false;

    var loop = function loop() {
      if (index === sourceList.length) {
        if (index === 0) sink(_constant.START);
        callback(_constant.FINISH);
        return;
      }

      loopCallback = sourceList[index++](function (type, payload) {
        if (type === _constant.START) {
          if (!isStarted) {
            isStarted = true;
            sink(_constant.START);
          } else {
            loopCallback(_constant.NEXT);
          }
        } else if (type === _constant.NEXT) {
          sink(_constant.NEXT, payload);
        } else if (type === _constant.FINISH) {
          loop();
        } else {
          sink(type, payload);
        }
      });
      loopCallback(_constant.START);
    };

    var callback = (0, _utility.guard)(function (type, payload) {
      if (type === _constant.START) {
        loop();
      } else if (type === _constant.FINISH) {
        loopCallback && loopCallback(_constant.FINISH);
        sink(_constant.FINISH);
      } else {
        loopCallback && loopCallback(type, payload);
      }
    });
    return callback;
  };
};

exports.concat = concat;

var share = function share(source) {
  var _source;

  var list = [];
  var isStarted = false;
  var isFinished = false;
  var listener = {
    start: function start() {
      isStarted = true;
      var sinkList = list.concat();

      for (var i = 0; i < sinkList.length; i++) {
        sinkList[i](_constant.START);
      }
    },
    next: function next(payload) {
      var sinkList = list.concat();

      for (var i = 0; i < sinkList.length; i++) {
        sinkList[i](_constant.NEXT, payload);
      }
    },
    finish: function finish() {
      isFinished = true;
      var sinkList = list.concat();

      for (var i = 0; i < sinkList.length; i++) {
        sinkList[i](_constant.FINISH);
      }
    }
  };
  var realCallback = (_source = source, lazyForEach(listener)(_source));
  return function (sink) {
    var callback = (0, _utility.guard)(function (type, payload) {
      if (type === _constant.START) {
        if (!isStarted) {
          realCallback(_constant.START);
        } else {
          sink(_constant.START);
        }
      } else if (type === _constant.NEXT) {
        if (isFinished) {
          sink(_constant.FINISH);
        } else {
          sink(_constant.ASYNC);
        }
      } else if (type === _constant.FINISH) {
        var index = list.indexOf(sink);

        if (index !== -1) {
          list.splice(index, 1);
        }

        if (list.length === 0) {
          realCallback(_constant.FINISH);
        } else {
          sink(_constant.FINISH);
        }
      } else {
        realCallback(type, payload);
      }
    });
    list.push(sink);
    return callback;
  };
};

exports.share = share;

var takeUntil = function takeUntil(until$) {
  return function (source) {
    return function (sink) {
      var innerCallback = null;
      var callback = source(function (type, payload) {
        if (type === _constant.START) {
          var _ref, _until$;

          innerCallback = (_ref = (_until$ = until$, take(1)(_until$)), lazyForEach(function () {
            return callback(_constant.FINISH);
          })(_ref));
          innerCallback(_constant.START);
        } else if (type === _constant.FINISH) {
          innerCallback(_constant.FINISH);
          sink(_constant.FINISH);
        } else {
          sink(type, payload);
        }
      });
      return callback;
    };
  };
};

exports.takeUntil = takeUntil;

var switchMap = function switchMap(makeSource) {
  return function (source) {
    return function (sink) {
      var innerCallback = null;

      var next = function next(payload) {
        return sink(_constant.NEXT, payload);
      };

      var finish = function finish() {
        innerCallback = null;
        callback(_constant.NEXT);
      };

      var callback = source(function (type, payload) {
        if (type === _constant.NEXT) {
          var _makeSource;

          innerCallback && innerCallback(_constant.FINISH);
          innerCallback = (_makeSource = makeSource(payload), lazyForEach(next, finish)(_makeSource));
          innerCallback(_constant.START);
        } else if (type === _constant.FINISH) {
          innerCallback && innerCallback(_constant.FINISH);
          sink(_constant.FINISH);
        } else {
          sink(type, payload);
        }
      });
      return (0, _utility.guard)(function (type, payload) {
        if (type === _constant.ASYNC) {
          callback(_constant.NEXT);
        } else if (type === _constant.NEXT) {
          if (innerCallback) {
            innerCallback(_constant.NEXT);
          } else {
            callback(_constant.NEXT);
          }
        } else {
          callback(type, payload);
        }
      });
    };
  };
};

exports.switchMap = switchMap;