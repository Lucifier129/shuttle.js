import { guard, log, logValue, noop } from './utility'

export const empty = sink => {
	return guard({
		...sink,
		next: sink.finish
	})
}

export const interval = (period = 1000) => sink => {
	let i = 0
	let timer = null
	let start = () => {
		timer = setInterval(() => sink.next(i++), period)
		sink.start()
	}
	let next = noop
	let finish = () => {
		clearInterval(timer)
		sink.finish()
	}
	return guard({ ...sink, start, next, finish })
}

const eventMethodList = [
	['addEventListener', 'removeEventListener'],
	['addListener', 'removeListener'],
	['subscribe', 'unsubscribe'],
	['on', 'off']
]
const findEventMethod = emitter => {
	let methodList = eventMethodList.filter(item => item[0] in emitter)[0]
	if (!methodList) throw new Error('unsupport event emitter')
	return methodList
}
export const fromEvent = (emitter, name, ...args) => sink => {
	let [on, off] = findEventMethod(emitter)
	let feed = value => sink.next(value)
	let start = () => {
		emitter[on](name, feed, ...args)
		sink.start()
	}
	let next = noop
	let finish = () => {
		emitter[off](name, feed, ...args)
		sink.finish()
	}
	return guard({
		...sink,
		start,
		next,
		finish
	})
}

export const fromArray = array => sink => {
	let i = 0
	let next = () => {
		if (i < array.length) {
			sink.next(array[i++])
		} else if (i === array.length) {
			action.finish()
		}
	}
	let action = guard({
		...sink,
		next
	})
	return action
}

export const of = (...array) => fromArray(array)

export const fromRange = (start = 0, end = 0, step = 1) => sink => {
	if (start === end) return empty(sink)
	let isGT = end > start
	let sent = start - step
	let next = value => {
		sent += step
		if (isGT ? sent <= end : sent >= end) {
			sink.next(sent)
		} else if (isGT ? sent > end : sent < end) {
			action.finish()
		}
	}
	let action = guard({
		...sink,
		next
	})
	return action
}

export const fromPromise = promise => sink => {
	let finished = false
	promise.then(
		value => {
			if (finished) return
			sink.next(value)
			action.finish()
		},
		error => {
			if (finished) return
			sink.error(error)
		}
	)
	let action = guard({
		...sink,
		next: noop,
		finish: () => {
			finished = true
			sink.finish()
		}
	})
	return action
}
