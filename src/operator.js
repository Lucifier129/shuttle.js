import { START, NEXT, FINISH, ASYNC } from './constant'
import { guard, log } from './utility'
import { toCallback, start, observe, onFinish, onNext } from './sink'

export const map = f => source => sink => {
	return source((type, payload) => {
		sink(type, type === NEXT ? f(payload) : payload)
	})
}

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

export const take = max => source => sink => {
	let count = 0
	let callback = source((type, payload) => {
		if (type === NEXT) {
			if (count < max) {
				count += 1
				sink(NEXT, payload)
				if (count === max) {
					callback(FINISH)
				}
			}
		} else if (type === FINISH) {
			sink(FINISH)
		} else {
			sink(type, payload)
		}
	})
	return callback
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
			sink(ASYNC)
		} else if (type === FINISH) {
			callbackList.forEach(callback => callback(FINISH))
			sink(FINISH)
		} else {
			sink(type, payload)
		}
	})
	return callback
}

const EMPTY = {}
export const combine = (...sourceList) => sink => {
	let finishCount = 0
	let start = callback => callback(START)
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
			callbackList.forEach(start)
			sink(START)
		} else if (type === NEXT) {
			sink(ASYNC)
		} else if (type === FINISH) {
			callbackList.forEach(callback => callback(FINISH))
			sink(FINISH)
		} else {
			sink(type, payload)
		}
	})
	return callback
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
					sink(ASYNC)
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
			sink(type, payload)
		}
	})
	return callback
}

export const switchMap = makeSource => source => sink => {
	let innerCallback = null
	let next = payload => sink(NEXT, payload)
	let finish = () => {
		innerCallback = null
		callback(NEXT)
	}
	let callback = source((type, payload) => {
		if (type === NEXT) {
			innerCallback && innerCallback(FINISH)
			innerCallback = makeSource(payload) |> onNext(next) |> onFinish(finish) |> toCallback
			innerCallback(START)
		} else if (type === FINISH) {
			innerCallback && innerCallback(FINISH)
			sink(FINISH)
		} else {
			sink(type, payload)
		}
	})
	return guard((type, payload) => {
		if (type === ASYNC) {
			callback(NEXT)
		} else if (type === NEXT) {
			if (innerCallback) {
				innerCallback(NEXT)
			} else {
				callback(NEXT)
			}
		} else {
			callback(type, payload)
		}
	})
}
