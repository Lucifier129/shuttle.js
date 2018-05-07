import { guard, log, logValue, noop, makeSink, makeHandler, isSource, isAction } from './utility'

export const create = producer => sink => {
	sink = makeSink(sink)
	let started = false
	let finished = false
	let handler = null
	let start = () => {
		if (started || finished) return
		started = true
		handler = producer({ next, finish, error })
		handler = makeHandler(handler)
		handler.start()
		sink.start()
		if (finished) return
		handler.next()
	}
	let next = value => {
		if (finished) return
		sink.next(value)
		if (finished) return
		handler.next()
	}
	let finish = () => {
		if (!started || finished) return
		finished = true
		handler.finish()
		sink.finish()
	}
	let error = err => {
		if (finished) return
		sink.error(err)
		handler.error(err)
	}
	return { start, finish }
}

export const empty = create(sink => ({ next: sink.finish }))
export const never = create(noop)

export const interval = period =>
	create(callback => {
		let i = 0
		let timer = null
		let start = () => setInterval(() => callback.next(i++), period)
		let finish = () => clearInterval(timer)
		return { start, finish }
	})

const eventMethodList = [
	['addEventListener', 'removeEventListener'], // dom event
	['addListener', 'removeListener'], // node.js event-emitter
	['subscribe', 'unsubscribe'], // pub/sub redux
	['on', 'off'] // jquery, event-system
]
const findEventMethod = emitter => {
	let methodList = eventMethodList.filter(item => item[0] in emitter)[0]
	if (!methodList) throw new Error('unsupport event emitter')
	return methodList
}
export const fromEvent = (emitter, name, ...args) =>
	create(callback => {
		let [on, off] = findEventMethod(emitter)
		let feed = value => callback.next(value)
		let start = () => emitter[on](name, feed, ...args)
		let finish = () => emitter[off](name, feed, ...args)
		return { start, finish }
	})

export const fromArray = array =>
	create(callback => {
		let count = 0
		let next = () => {
			if (count < array.length) {
				callback.next(array[count++])
			} else {
				callback.finish()
			}
		}
		return { next }
	})

export const of = (...array) => fromArray(array)

export const fromRange = (from = 0, to = 0, step = 1) =>
	create(callback => {
		if (from === to) return callback.finish()
		let isGT = to > from
		let sent = from - step
		let next = () => {
			sent += step
			if (isGT ? sent <= to : sent >= to) {
				callback.next(sent)
			} else {
				callback.finish()
			}
		}
		return { next }
	})

export const fromPromise = promise =>
	create(callback => ({
		start: () => promise.then(callback.next, callback.error).then(callback.finish)
	}))
