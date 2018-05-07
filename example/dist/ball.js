!function(t){var n={};function e(r){if(n[r])return n[r].exports;var i=n[r]={i:r,l:!1,exports:{}};return t[r].call(i.exports,i,i.exports,e),i.l=!0,i.exports}e.m=t,e.c=n,e.d=function(t,n,r){e.o(t,n)||Object.defineProperty(t,n,{configurable:!1,enumerable:!0,get:r})},e.r=function(t){Object.defineProperty(t,"__esModule",{value:!0})},e.n=function(t){var n=t&&t.__esModule?function(){return t.default}:function(){return t};return e.d(n,"a",n),n},e.o=function(t,n){return Object.prototype.hasOwnProperty.call(t,n)},e.p="",e(e.s=21)}({0:function(t,n,e){"use strict";function r(t,n,e){return n in t?Object.defineProperty(t,n,{value:e,enumerable:!0,configurable:!0,writable:!0}):t[n]=e,t}Object.defineProperty(n,"__esModule",{value:!0}),n.logAll=n.logValue=n.log=n.mapValue=n.makeHandler=n.makeSink=n.isAction=n.isSource=n.isObject=n.constant=n.identity=n.noop=n.pipe=void 0;n.pipe=function(){for(var t=arguments.length,n=new Array(t),e=0;e<t;e++)n[e]=arguments[e];return n.reduce(function(t,n){return n(t)})};var i=function(){};n.noop=i;n.identity=function(t){return t};n.constant=function(t){return function(){return t}};n.isObject=function(t){return"[object Object]"===Object.prototype.toString.call(t)};n.isSource=function(t){return!(!t||!t.isSource)};n.isAction=function(t){return!(!t||!t.isAction)};var o={start:i,next:i,finish:i,error:i};n.makeSink=function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};return s(o,function(n,e){return t[e]||n})};var u={start:i,next:i,finish:i,error:i};n.makeHandler=function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};return s(u,function(n,e){return t[e]||n})};var s=function(t,n){return Object.keys(t).reduce(function(e,r){return e[r]=n(t[r],r),e},{})};n.mapValue=s;n.log=function(t){return function(n){return function(e){return n({start:function(){console.log(t,"start"),e.start()},next:function(n){console.log(t,"next",n),e.next(n)},finish:function(){console.log(t,"finish"),e.finish()},error:function(n){console.log(t,"error",n),e.error(n)}})}}};n.logValue=function(t){return function(n){return function(e){return n(function(t){for(var n=1;n<arguments.length;n++){var e=null!=arguments[n]?arguments[n]:{},i=Object.keys(e);"function"==typeof Object.getOwnPropertySymbols&&(i=i.concat(Object.getOwnPropertySymbols(e).filter(function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),i.forEach(function(n){r(t,n,e[n])})}return t}({},e,{next:function(n){console.log(t,n),e.next(n)}}))}}};n.logAll=function(t){return function(n){return function(e){var r=n({start:function(){console.log(t,"sink:start"),e.start()},next:function(n){console.log(t,"sink:next",n),e.next(n)},finish:function(){console.log(t,"sink:finish"),e.finish()},error:function(n){console.log(t,"sink:error",n),e.error(n)}});return{start:function(){console.log(t,"action:start"),r.start()},finish:function(){console.log(t,"action:finish"),r.finish()}}}}}},1:function(t,n,e){"use strict";Object.defineProperty(n,"__esModule",{value:!0}),n.onError=n.onFinish=n.onNext=n.onStart=n.on=n.run=n.toAction=n.fork=void 0;var r=e(0);function i(t,n,e){return n in t?Object.defineProperty(t,n,{value:e,enumerable:!0,configurable:!0,writable:!0}):t[n]=e,t}n.fork=function(t){return function(n){return function(e){var i=(0,r.mapValue)((0,r.makeSink)(e),function(n,e){return function(r){t[e](r),n(r)}});return n(i)}}};var o=function(t){return function(n){return n((0,r.makeSink)(t))}};n.toAction=o;n.run=function(t){return function(n){"function"==typeof t&&(t={next:t});var e=o(t)(n);return e.start(),e}};var u=function(t){return function(n){return function(e){return function(r){return e(function(t){for(var n=1;n<arguments.length;n++){var e=null!=arguments[n]?arguments[n]:{},r=Object.keys(e);"function"==typeof Object.getOwnPropertySymbols&&(r=r.concat(Object.getOwnPropertySymbols(e).filter(function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.forEach(function(n){i(t,n,e[n])})}return t}({},r,i({},t,function(e){n(e),r[t](e)})))}}}};n.on=u;var s=u("start");n.onStart=s;var c=u("next");n.onNext=c;var a=u("finish");n.onFinish=a;var f=u("error");n.onError=f},2:function(t,n,e){"use strict";Object.defineProperty(n,"__esModule",{value:!0}),n.fromPromise=n.fromRange=n.of=n.fromArray=n.fromEvent=n.interval=n.never=n.empty=n.create=void 0;var r=e(0);function i(t,n){return function(t){if(Array.isArray(t))return t}(t)||function(t,n){var e=[],r=!0,i=!1,o=void 0;try{for(var u,s=t[Symbol.iterator]();!(r=(u=s.next()).done)&&(e.push(u.value),!n||e.length!==n);r=!0);}catch(t){i=!0,o=t}finally{try{r||null==s.return||s.return()}finally{if(i)throw o}}return e}(t,n)||function(){throw new TypeError("Invalid attempt to destructure non-iterable instance")}()}var o=function(t){return function(n){n=(0,r.makeSink)(n);var e=!1,i=!1,o=null,u=function(t){i||(n.next(t),i||o.next())},s=function(){e&&!i&&(i=!0,o.finish(),n.finish())},c=function(t){i||(n.error(t),o.error(t))};return{start:function(){e||i||(e=!0,o=t({next:u,finish:s,error:c}),(o=(0,r.makeHandler)(o)).start(),n.start(),i||o.next())},finish:s}}};n.create=o;var u=o(function(t){return{next:t.finish}});n.empty=u;var s=o(r.noop);n.never=s;n.interval=function(t){return o(function(n){var e=0;return{start:function(){return setInterval(function(){return n.next(e++)},t)},finish:function(){return clearInterval(null)}}})};var c=[["addEventListener","removeEventListener"],["addListener","removeListener"],["subscribe","unsubscribe"],["on","off"]];n.fromEvent=function(t,n){for(var e=arguments.length,r=new Array(e>2?e-2:0),u=2;u<e;u++)r[u-2]=arguments[u];return o(function(e){var o=i(function(t){var n=c.filter(function(n){return n[0]in t})[0];if(!n)throw new Error("unsupport event emitter");return n}(t),2),u=o[0],s=o[1],a=function(t){return e.next(t)};return{start:function(){return t[u].apply(t,[n,a].concat(r))},finish:function(){return t[s].apply(t,[n,a].concat(r))}}})};var a=function(t){return o(function(n){var e=0;return{next:function(){e<t.length?n.next(t[e++]):n.finish()}}})};n.fromArray=a;n.of=function(){for(var t=arguments.length,n=new Array(t),e=0;e<t;e++)n[e]=arguments[e];return a(n)};n.fromRange=function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:0,n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:0,e=arguments.length>2&&void 0!==arguments[2]?arguments[2]:1;return o(function(r){if(t===n)return r.finish();var i=n>t,o=t-e;return{next:function(){o+=e,(i?o<=n:o>=n)?r.next(o):r.finish()}}})};n.fromPromise=function(t){return o(function(n){return{start:function(){return t.then(n.next,n.error).then(n.finish)}}})}},21:function(t,n,e){"use strict";e(0);var r,i=e(2),o=e(1),u=e(3),s=e(5),c=(r=e(4))&&r.__esModule?r:{default:r};function a(t,n,e){return n in t?Object.defineProperty(t,n,{value:e,enumerable:!0,configurable:!0,writable:!0}):t[n]=e,t}var f,h,l,v,p,m,y,g,_,d,b,x,A,O,S,w,V,j,E,M,L={fromValue:1,toValue:0,stiffness:1e3,damping:20,mass:3},k=function(t){return(0,i.create)(function(n){var e=new s.Spring(function(t){for(var n=1;n<arguments.length;n++){var e=null!=arguments[n]?arguments[n]:{},r=Object.keys(e);"function"==typeof Object.getOwnPropertySymbols&&(r=r.concat(Object.getOwnPropertySymbols(e).filter(function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.forEach(function(n){a(t,n,e[n])})}return t}({},L,t));return{start:function(){e.start(),e.onUpdate(function(t){var e=t.currentValue;return n.next(e)}),e.onStop(function(){return n.finish()})},finish:function(){return e.stop()}}})},T=function(t){return t.touches?t.touches[0]:t},P=function(t){var n=(t=T(t)).clientX,e=t.clientY;return function(t){return t.preventDefault(),{left:(t=T(t)).clientX-n,top:t.clientY-e}}};f=document.querySelector(".ball"),b=new c.default,x={start:Symbol("start"),move:Symbol("move"),end:Symbol("end")},A=(0,i.fromEvent)(b,x.start),O=(0,i.fromEvent)(b,x.move),S=(0,i.fromEvent)(b,x.end),w=function(t){var n,e,r=t.left,i=t.top;return e=k(),n=(0,u.takeUntil)(A)(e),(0,u.map)(function(t){return{left:r*t,top:i*t}})(n)},V={data$:(d=A,_=(0,u.switchMap)(function(t){var n,e,r;return r=O,e=(0,u.map)(P(t))(r),n=(0,u.takeUntil)(S)(e),(0,u.then)(w)(n)})(d),(0,u.startWith)({left:0,top:0})(_)),handler:{start:function(t){return b.emit(x.start,t)},move:function(t){return b.emit(x.move,t)},end:function(t){return b.emit(x.end,t)}},emitter:b,symbol:x},j=V.data$,E=V.handler,M={passive:!1},h=(0,i.fromEvent)(f,"mousedown",M),(0,o.run)(E.start)(h),l=(0,i.fromEvent)(document,"mousemove",M),(0,o.run)(E.move)(l),v=(0,i.fromEvent)(document,"mouseup",M),(0,o.run)(E.end)(v),p=(0,i.fromEvent)(f,"touchstart",M),(0,o.run)(E.start)(p),m=(0,i.fromEvent)(document,"touchmove",M),(0,o.run)(E.move)(m),y=(0,i.fromEvent)(document,"touchend",M),(0,o.run)(E.end)(y),g=j,(0,o.run)(function(t){var n=t.left,e=t.top,r="translate(".concat(n,"px, ").concat(e,"px)");f.style.transform=r,f.style.webkitTransform=r})(g)},3:function(t,n,e){"use strict";Object.defineProperty(n,"__esModule",{value:!0}),n.share=n.startWith=n.reduce=n.switchMap=n.then=n.takeLast=n.takeUntil=n.skip=n.buffer=n.keep=n.scan=n.take=n.filter=n.mapTo=n.map=n.fromShape=n.fromObjectShape=n.fromArrayShape=n.combineWith=n.combine=n.mergeWith=n.merge=n.concatSourceBy=n.concatBy=n.concatSource=n.concat=void 0;var r=e(0),i=e(1),o=e(2);function u(t){for(var n=1;n<arguments.length;n++){var e=null!=arguments[n]?arguments[n]:{},r=Object.keys(e);"function"==typeof Object.getOwnPropertySymbols&&(r=r.concat(Object.getOwnPropertySymbols(e).filter(function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.forEach(function(n){s(t,n,e[n])})}return t}function s(t,n,e){return n in t?Object.defineProperty(t,n,{value:e,enumerable:!0,configurable:!0,writable:!0}):t[n]=e,t}function c(t){return function(t){if(Array.isArray(t)){for(var n=0,e=new Array(t.length);n<t.length;n++)e[n]=t[n];return e}}(t)||function(t){if(Symbol.iterator in Object(t)||"[object Arguments]"===Object.prototype.toString.call(t))return Array.from(t)}(t)||function(){throw new TypeError("Invalid attempt to spread non-iterable instance")}()}var a={},f=function(t){return(0,o.create)(function(n){var e=0,r=null,i={next:n.next,error:n.error,finish:function(){r=null,o()}},o=function(){if(!u){var o;try{o=t(e++)}catch(t){return n.error(t)}if(!o)return n.finish();(r=o(i)).start()}},u=!1;return{start:o,finish:function(){u=!0,r&&r.finish()}}})},h=function(){for(var t=arguments.length,n=new Array(t),e=0;e<t;e++)n[e]=arguments[e];return f(function(t){return n[t]})};n.concat=h;n.concatSource=function(t){return function(n){return h(n,t)}};var l=function(){for(var t=arguments.length,n=new Array(t),e=0;e<t;e++)n[e]=arguments[e];return f(function(t){var e=n[t];return e?e(t):null})};n.concatBy=l;var v=function(t){return function(n){return l(function(){return n},t)}};n.concatSourceBy=v;var p=function(){for(var t=arguments.length,n=new Array(t),e=0;e<t;e++)n[e]=arguments[e];return(0,o.create)(function(t){var e=0,r={next:t.next,error:t.error,finish:function(){return++e===n.length&&t.finish()}},i=n.map(function(t){return t(r)});return{start:function(){return i.forEach(function(t){return t.start()})},finish:function(){return i.forEach(function(t){return t.finish()})}}})};n.merge=p;n.mergeWith=function(t){return function(n){return p(n,t)}};var m=function(){for(var t=arguments.length,n=new Array(t),e=0;e<t;e++)n[e]=arguments[e];return(0,o.create)(function(t){var e=0,r=function(){return++e===n.length&&t.finish()},i=new Array(n.length),o=n.map(function(n,e){return i[e]=a,n({next:function(n){i[e]=n,-1===i.indexOf(a)&&t.next(i.concat())},finish:r,error:t.error})});return{start:function(){return o.forEach(function(t){return t.start()})},finish:function(){return o.forEach(function(t){return t.finish()})}}})};n.combine=m;n.combineWith=function(t){return function(n){return m(n,t)}};var y=function(t){return m.apply(void 0,c(t.map(_)))};n.fromArrayShape=y;var g=function(t){var n,e=Object.keys(t),r=e.map(function(n){return _(t[n])}),i=function(t,n,r){return t[e[r]]=n,t};return n=m.apply(void 0,c(r)),d(function(t){return t.reduce(i,{})})(n)};n.fromObjectShape=g;var _=function(t){return Array.isArray(t)?y(t):(0,r.isObject)(t)?g(t):"function"==typeof t?t:(0,o.of)(t)};n.fromShape=_;var d=function(t){return function(n){return function(e){return n(u({},e,{next:function(n){return e.next(t(n))}}))}}};n.map=d;n.mapTo=function(t){return d(function(){return t})};var b=function(t){return function(n){return function(e){return n(u({},e,{next:function(n){return t(n)&&e.next(n)}}))}}};n.filter=b;n.take=function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:0;return function(n){return function(e){var r=0,i=n(u({},e,{next:function(n){return r===t?i.finish():(r+=1,e.next(n),r===t?i.finish():void 0)}}));return i}}};var x=function(t,n){return function(e){var r,i=n;return r=e,d(function(n){return i=t(i,n)})(r)}};n.scan=x;n.keep=function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:2;return function(n){var e;return e=n,x(function(n,e){return n.push(e),n.length>t&&n.shift(),n},[])(e)}};n.buffer=function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:2,n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:t-1;return function(e){var r,i;return i=e,r=x(function(e,r){var i=e.slice(e.length===t?n:0);return i.push(r),i},[])(i),b(function(n){return n.length===t})(r)}};n.skip=function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:0;return b(function(){return 0===t||(t-=1,!1)})};n.takeUntil=function(t){return function(n){return function(e){var r=!1,i=function(){r||(r=!0,o.finish(),u.finish())},o=n(e),u=t({next:i});return{start:function(){o.start(),u.start()},finish:i}}}};var A=function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:1;return function(n){return function(e){var r,u,s,c=[];return s=n,u=(0,i.onNext)(function(n){c.push(n),c.length>t&&c.shift()})(s),r=v(function(){var t;return t=(0,o.fromArray)(c),(0,i.onNext)(e.next)(t)})(u),(0,i.toAction)({start:e.start,finish:e.finish,error:e.error})(r)}}};n.takeLast=A;n.then=function(t){return function(n){return function(e){var r,o,u,s=a;return u=n,o=(0,i.onNext)(function(t){return e.next(s=t)})(u),r=v(function(){var n;return s!==a&&(n=t(s),(0,i.onNext)(e.next)(n))})(o),(0,i.toAction)({start:e.start,finish:e.finish,error:e.error})(r)}}};n.switchMap=function(t){return function(n){return function(e){var r=null,i={next:e.next,error:e.error};return n(u({},e,{next:function(n){r&&r.finish();try{(r=t(n)(i)).start()}catch(t){e.error(t)}},finish:function(){r&&r.finish(),e.finish()}}))}}};n.reduce=function(t,n){return function(e){return function(r){var o,u,s;return s=e,u=x(t,n)(s),o=A()(u),(0,i.toAction)(r)(o)}}};n.startWith=function(t){return function(n){return h((0,o.of)(t),n)}};n.share=function(){var t=arguments.length>0&&void 0!==arguments[0]&&arguments[0];return function(n){var e=a,r=null,i=[],u={next:function(t){e=t,i.concat().forEach(function(n){return n.next(t)})},finish:function(){r=null,i.concat().forEach(function(t){return t.finish()})}};return(0,o.create)(function(o){return i.push(o),{start:function(){r?t&&e!==a&&o.next(e):(r=n(u)).start()},finish:function(){var t=i.findIndex(function(t){return t===o});-1!==t&&i.splice(t,1),0===i.length&&(r&&r.finish(),r=null)}}})}}},4:function(t,n){function e(){this._events=this._events||{},this._maxListeners=this._maxListeners||void 0}function r(t){return"function"==typeof t}function i(t){return"object"==typeof t&&null!==t}function o(t){return void 0===t}t.exports=e,e.EventEmitter=e,e.prototype._events=void 0,e.prototype._maxListeners=void 0,e.defaultMaxListeners=10,e.prototype.setMaxListeners=function(t){if("number"!=typeof t||t<0||isNaN(t))throw TypeError("n must be a positive number");return this._maxListeners=t,this},e.prototype.emit=function(t){var n,e,u,s,c,a;if(this._events||(this._events={}),"error"===t&&(!this._events.error||i(this._events.error)&&!this._events.error.length)){if((n=arguments[1])instanceof Error)throw n;var f=new Error('Uncaught, unspecified "error" event. ('+n+")");throw f.context=n,f}if(o(e=this._events[t]))return!1;if(r(e))switch(arguments.length){case 1:e.call(this);break;case 2:e.call(this,arguments[1]);break;case 3:e.call(this,arguments[1],arguments[2]);break;default:s=Array.prototype.slice.call(arguments,1),e.apply(this,s)}else if(i(e))for(s=Array.prototype.slice.call(arguments,1),u=(a=e.slice()).length,c=0;c<u;c++)a[c].apply(this,s);return!0},e.prototype.addListener=function(t,n){var u;if(!r(n))throw TypeError("listener must be a function");return this._events||(this._events={}),this._events.newListener&&this.emit("newListener",t,r(n.listener)?n.listener:n),this._events[t]?i(this._events[t])?this._events[t].push(n):this._events[t]=[this._events[t],n]:this._events[t]=n,i(this._events[t])&&!this._events[t].warned&&(u=o(this._maxListeners)?e.defaultMaxListeners:this._maxListeners)&&u>0&&this._events[t].length>u&&(this._events[t].warned=!0,console.error("(node) warning: possible EventEmitter memory leak detected. %d listeners added. Use emitter.setMaxListeners() to increase limit.",this._events[t].length),"function"==typeof console.trace&&console.trace()),this},e.prototype.on=e.prototype.addListener,e.prototype.once=function(t,n){if(!r(n))throw TypeError("listener must be a function");var e=!1;function i(){this.removeListener(t,i),e||(e=!0,n.apply(this,arguments))}return i.listener=n,this.on(t,i),this},e.prototype.removeListener=function(t,n){var e,o,u,s;if(!r(n))throw TypeError("listener must be a function");if(!this._events||!this._events[t])return this;if(u=(e=this._events[t]).length,o=-1,e===n||r(e.listener)&&e.listener===n)delete this._events[t],this._events.removeListener&&this.emit("removeListener",t,n);else if(i(e)){for(s=u;s-- >0;)if(e[s]===n||e[s].listener&&e[s].listener===n){o=s;break}if(o<0)return this;1===e.length?(e.length=0,delete this._events[t]):e.splice(o,1),this._events.removeListener&&this.emit("removeListener",t,n)}return this},e.prototype.removeAllListeners=function(t){var n,e;if(!this._events)return this;if(!this._events.removeListener)return 0===arguments.length?this._events={}:this._events[t]&&delete this._events[t],this;if(0===arguments.length){for(n in this._events)"removeListener"!==n&&this.removeAllListeners(n);return this.removeAllListeners("removeListener"),this._events={},this}if(r(e=this._events[t]))this.removeListener(t,e);else if(e)for(;e.length;)this.removeListener(t,e[e.length-1]);return delete this._events[t],this},e.prototype.listeners=function(t){return this._events&&this._events[t]?r(this._events[t])?[this._events[t]]:this._events[t].slice():[]},e.prototype.listenerCount=function(t){if(this._events){var n=this._events[t];if(r(n))return 1;if(n)return n.length}return 0},e.listenerCount=function(t,n){return t.listenerCount(n)}},5:function(t,n,e){"use strict";e.r(n),e.d(n,"Spring",function(){return u});var r=Object.assign||function(t){for(var n,e=1,r=arguments.length;e<r;e++)for(var i in n=arguments[e])Object.prototype.hasOwnProperty.call(n,i)&&(t[i]=n[i]);return t};function i(t,n){if(!t)throw new Error(n)}function o(t,n){return void 0!==t&&null!==t?t:n}var u=function(){function t(t){void 0===t&&(t={}),this._listeners=[],this._currentAnimationStep=0,this._currentTime=0,this._springTime=0,this._currentValue=0,this._currentVelocity=0,this._isAnimating=!1,this._oscillationVelocityPairs=[],this._config={fromValue:o(t.fromValue,0),toValue:o(t.toValue,1),stiffness:o(t.stiffness,100),damping:o(t.damping,10),mass:o(t.mass,1),initialVelocity:o(t.initialVelocity,0),overshootClamping:o(t.overshootClamping,!1),allowsOverdamping:o(t.allowsOverdamping,!1),restVelocityThreshold:o(t.restVelocityThreshold,.001),restDisplacementThreshold:o(t.restDisplacementThreshold,.001)},this._currentValue=this._config.fromValue,this._currentVelocity=this._config.initialVelocity}return t.prototype.start=function(){var t=this,n=this._config,e=n.fromValue,r=n.toValue,i=n.initialVelocity;return e===r&&0===i||(this._reset(),this._isAnimating=!0,this._currentAnimationStep||(this._notifyListeners("onStart"),this._currentAnimationStep=requestAnimationFrame(function(n){t._step(Date.now())}))),this},t.prototype.stop=function(){return this._isAnimating?(this._isAnimating=!1,this._notifyListeners("onStop"),this._currentAnimationStep&&(cancelAnimationFrame(this._currentAnimationStep),this._currentAnimationStep=0),this):this},Object.defineProperty(t.prototype,"currentValue",{get:function(){return this._currentValue},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"currentVelocity",{get:function(){return this._currentVelocity},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"isAtRest",{get:function(){return this._isSpringAtRest()},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"isAnimating",{get:function(){return this._isAnimating},enumerable:!0,configurable:!0}),t.prototype.updateConfig=function(t){this._advanceSpringToTime(Date.now());var n={fromValue:this._currentValue,initialVelocity:this._currentVelocity};return this._config=r({},this._config,n,t),this._reset(),this},t.prototype.onStart=function(t){return this._listeners.push({onStart:t}),this},t.prototype.onUpdate=function(t){return this._listeners.push({onUpdate:t}),this},t.prototype.onStop=function(t){return this._listeners.push({onStop:t}),this},t.prototype.removeListener=function(t){return this._listeners=this._listeners.reduce(function(n,e){return-1!==Object.values(e).indexOf(t)||n.push(e),n},[]),this},t.prototype.removeAllListeners=function(){return this._listeners=[],this},t.prototype._reset=function(){this._currentTime=Date.now(),this._springTime=0,this._currentValue=this._config.fromValue,this._currentVelocity=this._config.initialVelocity},t.prototype._notifyListeners=function(t){var n=this;this._listeners.forEach(function(e){var r=e[t];"function"==typeof r&&r(n)})},t.prototype._step=function(t){var n=this;this._advanceSpringToTime(t,!0),this._isAnimating&&(this._currentAnimationStep=requestAnimationFrame(function(t){return n._step(Date.now())}))},t.prototype._advanceSpringToTime=function(n,e){if(void 0===e&&(e=!1),this._isAnimating){var r=n-this._currentTime;r>t.MAX_DELTA_TIME_MS&&(r=t.MAX_DELTA_TIME_MS),this._springTime+=r;var o=this._config.damping,u=this._config.mass,s=this._config.stiffness,c=this._config.fromValue,a=this._config.toValue,f=-this._config.initialVelocity;i(u>0,"Mass value must be greater than 0"),i(s>0,"Stiffness value must be greater than 0"),i(o>0,"Damping value must be greater than 0");var h=o/(2*Math.sqrt(s*u)),l=Math.sqrt(s/u)/1e3,v=l*Math.sqrt(1-h*h),p=l*Math.sqrt(h*h-1),m=a-c;h>1&&!this._config.allowsOverdamping&&(h=1);var y=0,g=0,_=this._springTime;if(h<1)y=a-(d=Math.exp(-h*l*_))*((f+h*l*m)/v*Math.sin(v*_)+m*Math.cos(v*_)),g=h*l*d*(Math.sin(v*_)*(f+h*l*m)/v+m*Math.cos(v*_))-d*(Math.cos(v*_)*(f+h*l*m)-v*m*Math.sin(v*_));else if(1===h)y=a-(d=Math.exp(-l*_))*(m+(f+l*m)*_),g=d*(f*(_*l-1)+_*m*(l*l));else{var d;y=a-(d=Math.exp(-h*l*_))*((f+h*l*m)*Math.sinh(p*_)+p*m*Math.cosh(p*_))/p,g=d*h*l*(Math.sinh(p*_)*(f+h*l*m)+m*p*Math.cosh(p*_))/p-d*(p*Math.cosh(p*_)*(f+h*l*m)+p*p*m*Math.sinh(p*_))/p}if(this._currentTime=n,this._currentValue=y,this._currentVelocity=g,e&&(this._notifyListeners("onUpdate"),this._isAnimating))return this._isSpringOvershooting()||this._isSpringAtRest()?(0!==s&&(this._currentValue=a,this._currentVelocity=0,this._notifyListeners("onUpdate")),void this.stop()):void 0}},t.prototype._isSpringOvershooting=function(){var t=this._config,n=t.stiffness,e=t.fromValue,r=t.toValue,i=!1;return t.overshootClamping&&0!==n&&(i=e<r?this._currentValue>r:this._currentValue<r),i},t.prototype._isSpringAtRest=function(){var t=this._config,n=t.stiffness,e=t.toValue,r=t.restDisplacementThreshold,i=t.restVelocityThreshold,o=Math.abs(this._currentVelocity)<=i;return 0!==n&&Math.abs(e-this._currentValue)<=r&&o},t.MAX_DELTA_TIME_MS=1/60*1e3*4,t}()}});