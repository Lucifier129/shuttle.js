import { START, NEXT, FINISH } from './constant'
import { guard, log, logValue } from './utility'
import { empty, once, fromRange, fromAction, fromArray } from './source'
import { toCallback, start, observe } from './sink'

export const fork = f => source => sink => {
	let callback = source((type, payload) => {
		f(type, payload)
		sink(type, payload)
	})
	return callback
}

export const forkIf = (f, theType) => source => sink => {
	let isMatch = Array.isArray(theType) ? type => theType.indexOf(type) !== -1 : type => type === theType
	let callback = source((type, payload) => {
		if (isMatch(type)) {
			f(type, payload)
		}
		sink(type, payload)
	})
	return callback
}

export const forkIfNot = (f, theType) => source => sink => {
	let isMatch = Array.isArray(theType) ? type => theType.indexOf(type) === -1 : type => type !== theType
	let callback = source((type, payload) => {
		if (isMatch(type)) {
			f(type, payload)
		}
		sink(type, payload)
	})
	return callback
}

export const shuntIf = (f, theType) => source => sink => {
	let isMatch = Array.isArray(theType) ? type => theType.indexOf(type) !== -1 : type => type === theType
	let callback = source((type, payload) => {
		if (isMatch(type)) {
			f(type, payload)
		} else {
			sink(type, payload)
		}
	})
	return callback
}

export const shuntIfNot = (f, theType) => source => sink => {
	let isMatch = Array.isArray(theType) ? type => theType.indexOf(type) === -1 : type => type !== theType
	let callback = source((type, payload) => {
		if (isMatch(type)) {
			f(type, payload)
		} else {
			sink(type, payload)
		}
	})
	return callback
}

export const forkAndSwitchIf = (f, theType, toType) => {
	let getType = Array.isArray(toType) ? type => toType[theType.indexOf(type)] : type => toType
	return forkIf((type, payload) => f(getType(type), payload), theType)
}

export const forkAndSwitchIfNot = (f, theType, toType) => {
	let getType = Array.isArray(toType) ? type => toType[theType.indexOf(type)] : type => toType
	return forkIfNot((type, payload) => f(getType(type), payload), theType)
}

export const shuntAndSwitchIf = (f, theType, toType) => {
	let getType = Array.isArray(toType) ? type => toType[theType.indexOf(type)] : type => toType
	return shuntIf((type, payload) => f(getType(type), payload), theType)
}

export const shuntAndSwitchIfNot = (f, theType, toType) => {
	let getType = Array.isArray(toType) ? type => toType[theType.indexOf(type)] : type => toType
	return shuntIfNot((type, payload) => f(getType(type), payload), theType)
}

export const map = f => source => sink => {
	return source((type, payload) => {
		sink(type, type === NEXT ? f(payload) : payload)
	})
}

export const mapTo = value => map(() => value)

export const filter = f => source => sink => {
	let callback = source((type, payload) => {
		if (type === NEXT) {
			if (f(payload)) {
				sink(NEXT, payload)
			} else {
				callback(NEXT)
			}
		} else {
			sink(type, payload)
		}
	})
	return callback
}

export const skip = (count = 0) =>
	filter(() => {
		if (count === 0) return true
		count -= 1
		return false
	})

export const take = max => source => sink => {
	let innerCallback = source(sink)
	let count = 0
	let callback = guard((type, payload) => {
		if (type === NEXT) {
			if (count === max) return callback(FINISH)
			count += 1
		}
		innerCallback(type, payload)
	})
	return callback
}

export const scan = (f, seed) => source => sink => {
	let acc = seed
	return source((type, payload) => {
		if (type === NEXT) {
			sink(NEXT, (acc = f(acc, payload)))
		} else {
			sink(type, payload)
		}
	})
}

export const reduce = (f, seed) => source => sink => {
	return source |> scan(f, seed) |> then(list => fromArray(list) |> fork(sink)) |> toCallback
}

export const makeSource = make => sink => {
	let safeSink = guard(sink)
	let MAKE = {}
	let innerCallback = null
	let callback = guard((type, payload) => {
		if (type === START) return callback(MAKE)
		if (type === MAKE) {
			let source = make()
			innerCallback = null
			if (!source) {
				callback(FINISH)
			} else {
				innerCallback = source |> forkIfNot(safeSink, FINISH) |> forkAndSwitchIf(callback, FINISH, MAKE) |> toCallback
				innerCallback(START)
			}
		} else if (type === FINISH) {
			innerCallback && innerCallback(FINISH)
			safeSink(FINISH)
		} else {
			innerCallback && innerCallback(type, payload)
		}
	})
	return callback
}

export const makeSourceOnce = make => {
	let used = false
	return makeSource(() => {
		if (used) return
		used = true
		return make()
	})
}
export const concat = (...sourceList) => makeSource(() => sourceList.shift())
export const concatMake = (...makeList) => makeSource(() => makeList.shift()())
export const concatWith = source2 => source1 => concat(source1, source2)
export const concatWithMake = make => source => {
	let first = false
	let last = false
	return makeSource(() => {
		if (!first) {
			first = true
			return source
		}
		if (!last) {
			last = true
			return make()
		}
	})
}

export const takeLast = (count = 1) => source => sink => {
	let list = []
	let collect = (_, payload) => {
		list.push(payload)
		if (list.length > count) list.shift()
	}
	return source |> forkIf(collect, NEXT) |> concatWithMake(() => fromArray(list) |> fork(sink)) |> toCallback
}

export const then = makeSource => source => sink => {
	let safeSink = guard(sink)
	return source |> forkIfNot(safeSink, FINISH) |> takeLast() |> switchMap(makeSource) |> fork(safeSink) |> toCallback
}

export const merge = (...sourceList) => sink => {
	let safeSink = guard(sink)
	let callbackList
	let finishCount = 0
	let getCallback = source => source |> forkIf(safeSink, NEXT) |> forkIf(finish, FINISH) |> toCallback
	let startAll = callback => callback(START)
	let finishAll = callback => callback(FINISH)
	let finish = () => ++finishCount === sourceList.length && callback(FINISH)
	let callback = guard((type, payload) => {
		if (type === NEXT) return
		if (type === START) {
			callbackList = sourceList.map(getCallback)
			callbackList.forEach(startAll)
			safeSink(START)
		} else if (type === FINISH) {
			callbackList.forEach(finishAll)
			safeSink(FINISH)
		} else {
			callbackList && callbackList.forEach(callback => callback(type, payload))
			safeSink(type, payload)
		}
	})
	return callback
}

const EMPTY = {}
export const combine = (...sourceList) => sink => {
	let finishCount = 0
	let finish = () => ++finishCount === sourceList.length && callback(FINISH)
	let valueList = []
	let next = (payload, index) => {
		valueList[index] = payload
		if (valueList.indexOf(EMPTY) === -1) {
			sink(NEXT, valueList.concat())
		}
	}
	let callbackList = sourceList.map((source, index) => {
		valueList[index] = EMPTY
		return source |> forkIf((_, payload) => next(payload, index), NEXT) |> forkIf(finish, FINISH) |> toCallback
	})
	let callback = guard((type, payload) => {
		if (type === NEXT) return
		if (type === START) {
			callbackList.forEach(callback => callback(START))
			sink(START)
		} else if (type === FINISH) {
			callbackList.forEach(callback => callback(FINISH))
			sink(FINISH)
		} else {
			callbackList.forEach(callback => callback(type, payload))
			sink(type, payload)
		}
	})
	return callback
}

export const combineObject = shape => {
	let keys = Object.keys(shape)
	let sourceList = keys.map(key => shape[key])
	return (
		combine(...sourceList)
		|> map(valueList => {
			return valueList.reduce((result, value, index) => {
				result[keys[index]] = value
				return result
			}, {})
		})
	)
}

export const share = source => {
	let list = []
	let isStarted = false
	let isFinished = false
	let start = () => {
		isStarted = true
		let sinkList = list.concat()
		for (let i = 0; i < sinkList.length; i++) {
			sinkList[i](START)
		}
	}
	let next = (_, payload) => {
		let sinkList = list.concat()
		for (let i = 0; i < sinkList.length; i++) {
			sinkList[i](NEXT, payload)
		}
	}
	let finish = () => {
		let sinkList = list.concat()
		for (let i = 0; i < sinkList.length; i++) {
			sinkList[i](FINISH)
		}
	}
	let realCallback = source |> forkIf(start, START) |> forkIf(next, NEXT) |> forkIf(finish, FINISH) |> toCallback
	return sink => {
		let callback = guard((type, payload) => {
			if (type === START) {
				if (!isStarted) {
					realCallback(START)
				} else {
					sink(START)
				}
			} else if (type === NEXT) {
				if (isFinished) {
					sink(FINISH)
				} else {
					return
				}
			} else if (type === FINISH) {
				let index = list.indexOf(sink)
				if (index !== -1) {
					list.splice(index, 1)
				}
				sink(FINISH)
				if (list.length === 0) {
					realCallback(FINISH)
				}
			} else {
				realCallback(type, payload)
			}
		})
		list.push(sink)
		return callback
	}
}

export const takeUntil = until$ => source => sink => {
	let innerCallback = null
	let callback = source((type, payload) => {
		if (type === START) {
			innerCallback = until$ |> forkAndSwitchIf(callback, NEXT, FINISH) |> toCallback
			innerCallback(START)
			sink(START)
		} else if (type === FINISH) {
			innerCallback(FINISH)
			sink(FINISH)
		} else {
			if (type !== NEXT) {
				innerCallback && innerCallback(type, payload)
			}
			sink(type, payload)
		}
	})
	return callback
}

export const switchMap = makeSource => source => sink => {
	let innerCallback = null
	let outerFinished = false
	let innerFinished = false
	let finish = () => {
		innerCallback = null
		innerFinished = true
		if (outerFinished) {
			callback(FINISH)
		} else {
			outerCallback(NEXT)
		}
	}
	let outerCallback = source((type, payload) => {
		if (type === NEXT) {
			innerCallback && innerCallback(FINISH)
			innerCallback = makeSource(payload) |> forkIf(sink, NEXT) |> forkIf(finish, FINISH) |> toCallback
			innerFinished = false
			innerCallback(START)
		} else if (type === FINISH) {
			outerFinished = true
			if (innerFinished) {
				callback(FINISH)
			}
		} else {
			innerCallback && innerCallback(type, payload)
			sink(type, payload)
		}
	})
	let callback = guard((type, payload) => {
		if (type === NEXT) {
			if (innerCallback) {
				innerCallback(NEXT)
			} else {
				outerCallback(NEXT)
			}
		} else if (type === FINISH) {
			innerCallback && innerCallback(FINISH)
			outerCallback(FINISH)
			sink(FINISH)
		} else {
			outerCallback(type, payload)
		}
	})
	return callback
}

export const startWith = startValue => source => sink => {
	let sent = false
	let callback = source(sink)
	return guard((type, payload) => {
		if (type === NEXT) {
			if (!sent) {
				sent = true
				sink(NEXT, startValue)
			} else {
				callback(type, payload)
			}
		} else {
			callback(type, payload)
		}
	})
}
