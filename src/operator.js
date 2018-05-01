import { START, NEXT, FINISH } from './constant'
import { guard, log, logValue } from './utility'
import { empty, fromRange, fromAction, fromArray } from './source'
import { toCallback, start, observe } from './sink'

export const bind = f => source => sink => {
	return source((type, payload) => {
		f(type, payload)
		sink(type, payload)
	})
}

export const whenStart = (callback, theType = START) =>
	bind((type, payload) => {
		if (type === START) callback(theType, payload)
	})

export const whenNext = (callback, theType = NEXT) =>
	bind((type, payload) => {
		if (type === NEXT) callback(theType, payload)
	})

export const whenFinish = (callback, theType = FINISH) =>
	bind((type, payload) => {
		if (type === FINISH) callback(theType, payload)
	})

export const onStart = f => whenStart((_, payload) => f(payload))
export const onNext = f => whenNext((_, payload) => f(payload))
export const onFinish = f => whenFinish((_, payload) => f(payload))

export const whenNotStart = (callback, theType = START) =>
	bind((type, payload) => {
		if (type !== START) callback(theType, payload)
	})

export const whenNotNext = (callback, theType = NEXT) =>
	bind((type, payload) => {
		if (type !== NEXT) callback(theType, payload)
	})

export const whenNotFinish = (callback, theType = FINISH) =>
	bind((type, payload) => {
		if (type !== FINISH) callback(theType, payload)
	})

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
	let count = 0
	let callback = source((type, payload) => {
		if (type === NEXT) {
			if (count < max) {
				count += 1
				sink(NEXT, payload)
			}
			if (count === max) {
				callback(FINISH)
			}
		} else {
			sink(type, payload)
		}
	})
	return callback
}

const NEXT_OF_TAKE_LAST = {}
export const takeLast = (count = 1) => source => sink => {
	let outerFinished = false
	let list = []
	let innerCallback =
		source
		|> onNext(payload => {
			list.push(payload)
			if (list.length > count) {
				list.shift()
			}
		})
		|> onFinish(() => {
			if (outerFinished) return
			innerCallback =
				fromArray(list) |> whenNext(outerCallback, NEXT_OF_TAKE_LAST) |> whenFinish(outerCallback) |> toCallback
			innerCallback(START)
		})
		|> toCallback
	let outerCallback =
		fromAction(NEXT_OF_TAKE_LAST)
		|> onFinish(() => (outerFinished = true))
		|> bind((type, payload) => {
			if (type !== NEXT) {
				innerCallback(type, payload)
			}
		})
		|> bind(sink)
		|> toCallback
	return outerCallback
}

export const then = makeSource => source => sink => {
	let fakeSink = (type, payload) => type !== FINISH && sink(type, payload)
	return source |> bind(fakeSink) |> takeLast() |> switchMap(makeSource) |> bind(sink) |> toCallback
}

export const merge = (...sourceList) => sink => {
	let callbackList
	let finishCount = 0
	let next = payload => sink(NEXT, payload)
	let finish = () => ++finishCount === sourceList.length && callback(FINISH)
	let callback = guard((type, payload) => {
		if (type === START) {
			callbackList = sourceList.map(source => source |> onNext(next) |> onFinish(finish) |> start)
			sink(START)
		} else if (type === NEXT) {
			return
		} else if (type === FINISH) {
			callbackList.forEach(callback => callback(FINISH))
			sink(FINISH)
		} else {
			callbackList && callbackList.forEach(callback => callback(type, payload))
			sink(type, payload)
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
		return source |> onNext(payload => next(payload, index)) |> onFinish(finish) |> toCallback
	})
	let callback = guard((type, payload) => {
		if (type === START) {
			callbackList.forEach(callback => callback(START))
			sink(START)
		} else if (type === NEXT) {
			return
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

export const concat = (...sourceList) => sink => {
	let index = 0
	let loopCallback = null
	let isStarted = false
	let loop = () => {
		if (index === sourceList.length) {
			if (index === 0) sink(START)
			callback(FINISH)
			return
		}
		loopCallback = sourceList[index++]((type, payload) => {
			if (type === START) {
				if (!isStarted) {
					isStarted = true
					sink(START)
				} else {
					loopCallback(NEXT)
				}
			} else if (type === NEXT) {
				sink(NEXT, payload)
			} else if (type === FINISH) {
				loop()
			} else {
				sink(type, payload)
			}
		})
		loopCallback(START)
	}
	let callback = guard((type, payload) => {
		if (type === START) {
			loop()
		} else if (type === FINISH) {
			loopCallback && loopCallback(FINISH)
			sink(FINISH)
		} else {
			loopCallback && loopCallback(type, payload)
		}
	})
	return callback
}

export const share = source => {
	let list = []
	let isStarted = false
	let isFinished = false
	let observer = {
		start() {
			isStarted = true
			let sinkList = list.concat()
			for (let i = 0; i < sinkList.length; i++) {
				sinkList[i](START)
			}
		},
		next(payload) {
			let sinkList = list.concat()
			for (let i = 0; i < sinkList.length; i++) {
				sinkList[i](NEXT, payload)
			}
		},
		finish() {
			isFinished = true
			let sinkList = list.concat()
			for (let i = 0; i < sinkList.length; i++) {
				sinkList[i](FINISH)
			}
		}
	}
	let realCallback = source |> observe(observer) |> toCallback
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
			innerCallback = until$ |> onNext(() => callback(FINISH)) |> toCallback
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
	let next = payload => sink(NEXT, payload)
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
			innerCallback = makeSource(payload) |> onNext(next) |> onFinish(finish) |> toCallback
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

// export const startWith = value => source => concat(fromArray(value), source)

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
