/*!
 * shuttle.js.js v0.0.1
 * (c) 2017-09-19 Jade Gu
 * Released under the MIT License.
 * @license
 */
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.Shuttle = global.Shuttle || {}, global.Shuttle.js = factory());
}(this, (function () { 'use strict';

var index = {
    fromJS: function fromJS() {},
    toJS: function toJS() {}
};

return index;

})));
