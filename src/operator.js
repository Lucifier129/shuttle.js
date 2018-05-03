import { guard, log, logValue, noop, identity } from './utility'
import { pullable, run, onStart, onNext, onFinish, onError, fork } from './sink'
import { fromEvent, fromArray, fromRange, interval, of } from './source'

const consume = make => sink => {
	let count = 0
	let innerAction = null
	let innerSink = {
		next: sink.next,
		error: sink.error,
		finish: () => {
			innerAction = null
			outerAction && doMake()
		}
	}
	let doMake = () => {
		let makedSource = make(count++)
		if (!makedSource) return outerAction.finish()
		innerAction = pullable(innerSink)(makedSource)
		innerAction.start()
	}
	let outerAction = guard({
		...sink,
		start: () => {
			sink.start()
			doMake()
		},
		next: noop,
		finish: () => {
			outerAction = null
			innerAction && innerAction.finish()
			sink.finish()
		}
	})
	return outerAction
}

export const concat = (...sourceList) => consume(count => sourceList[count])
export const concatSource = source2 => source1 => concat(source1, source2)
export const concatBy = (...makeList) =>
	consume(count => {
		let make = makeList[count]
		return make ? make(count) : null
	})
export const concatSourceBy = make => source => concatBy(() => source, make)

export const merge = (...sourceList) => sink => {
	let finishCount = 0
	let innerSink = {
		next: sink.next,
		error: sink.error,
		finish: () => {
			if (++finishCount === sourceList.length) action.finish()
		}
	}
	let actionList = sourceList.map(source => source |> pullable(innerSink))
	let action = guard({
		...sink,
		start: () => {
			actionList.forEach(innerAction => innerAction.start())
			sink.start()
		},
		next: noop,
		finish: () => {
			actionList.forEach(innerAction => innerAction.finish())
			sink.finish()
		}
	})
	return action
}

export const mergeWith = source2 => source1 => merge(source1, source2)

const EMPTY = {}
export const combine = (...sourceList) => sink => {
	let finishCount = 0
	let innerFinish = () => {
		if (++finishCount === sourceList.length) action.finish()
	}
	let valueList = new Array(sourceList.length)
	let actionList = sourceList.map((source, index) => {
		let innerSink = {
			next: value => {
				valueList[index] = value
				if (valueList.indexOf(EMPTY) === -1) {
					sink.next(valueList.concat())
				}
			},
			finish: innerFinish,
			error: sink.error
		}
		valueList[index] = EMPTY
		return source |> pullable(innerSink)
	})
	let action = guard({
		...sink,
		start: () => {
			actionList.forEach(innerAction => innerAction.start())
			sink.start()
		},
		next: noop,
		finish: () => {
			actionList.forEach(innerAction => innerAction.finish())
			sink.finish()
		}
	})
	return action
}

export const combineWith = source2 => source1 => combine(source1, source2)

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

export const map = f => source => sink => {
	return source({
		...sink,
		next: value => sink.next(f(value))
	})
}

export const mapTo = value => map(() => value)

export const filter = f => source => sink => {
	let next = value => {
		if (f(value)) {
			sink.next(value)
		} else {
			action.next()
		}
	}
	let action = source({
		...sink,
		next
	})
	return action
}

export const take = (max = 0) => source => sink => {
	let action = source(sink)
	let count = 0
	let next = () => {
		if (count === max) return action.finish()
		count += 1
		action.next()
	}
	return {
		...action,
		next
	}
}

export const scan = (f, seed) => source => sink => {
	let acc = seed
	let next = value => sink.next((acc = f(acc, value)))
	return source({
		...sink,
		next
	})
}

export const skip = (count = 0) => {
	return filter(() => {
		if (count === 0) return true
		count -= 1
		return false
	})
}

export const takeUntil = until$ => source => sink => {
	let action = source(sink)
	let start = () => {
		action.start()
		untilAction.start()
	}
	let next = () => {
		action.finish()
		untilAction.finish()
	}
	let untilAction = pullable({ next })(until$)
	return {
		...action,
		start
	}
}

export const takeLast = (count = 1) => source => sink => {
	let list = []
	let innerSink = {
		next: value => {
			list.push(value)
			if (list.length > count) list.shift()
		},
		finish: () => {
			if (!action) return
			action = pullable(sink)(fromArray(list))
			action.start()
		}
	}
	let action = pullable(innerSink)(source)
	return guard({
		...sink,
		start: action.start,
		next: noop,
		finish: () => {
			let finish = action.finish
			action = null
			finish()
		}
	})
}

export const switchMap = (makeSource, f = identity) => source => sink => {
	let innerAction = null
	let innerSink = {
		next: value => sink.next(f(value)),
		finish: () => {
			if (!innerAction) return
			innerAction = null
			outerAction.next()
		}
	}
	let outerAction = source({
		...sink,
		next: value => {
			if (innerAction) {
				let { finish } = innerAction
				innerAction = null
				finish()
			}
			innerAction = pullable(innerSink)(makeSource(value))
			innerAction.start()
		}
	})
	return guard({
		...outerAction,
		next: () => {
			!innerAction && outerAction.next()
		},
		finish: () => {
			let innerFinish = innerAction ? innerAction.finish : noop
			let outerFinish = outerAction.finish
			innerAction = outerAction = null
			innerFinish()
			outerFinish()
		}
	})
}

export const then = make => source => sink => {
	return source |> onNext(sink.next) |> takeLast() |> switchMap(make) |> pullable(sink)
}

export const reduce = (f, seed) => source => sink => {
	return source |> scan(f, seed) |> then(list => fromArray(list) |> fork(sink)) |> pullable
}

export const startWith = value => source => concat(of(value), source)
