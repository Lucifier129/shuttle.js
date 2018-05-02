import { START, NEXT, FINISH } from './constant'
import { guard, log } from './utility'

export const empty = sink => {
	let callback = guard((type, payload) => {
		if (type === NEXT) return callback(FINISH)
		sink(type, payload)
	})
	return callback
}

export const once = sink => {
	let sent = false
	let callback = guard((type, payload) => {
		if (type === NEXT) {
			if (!sent) {
				sent = true
				sink(NEXT)
			} else {
				callback(FINISH)
			}
		} else {
			sink(type, payload)
		}
	})
	return callback
}

export const interval = period => sink => {
	let timer
	let i = 0
	return guard((type, payload) => {
		if (type === START) timer = setInterval(() => sink(NEXT, i++), period)
		if (type === FINISH) clearInterval(timer)
		if (type === NEXT) return
		sink(type, payload)
	})
}

export const fromArray = array => sink => {
	let i = 0
	let callback = guard((type, payload) => {
		if (type === NEXT) {
			if (i < array.length) {
				sink(NEXT, array[i++])
			} else if (i === array.length) {
				callback(FINISH)
			}
		} else {
			sink(type, payload)
		}
	})
	return callback
}

export const of = (...array) => fromArray(array)

export const fromRange = (start = 0, end = 0, step = 1) => sink => {
	if (start === end) return empty(sink)
	let isGT = end > start
	let sent = start - step
	let callback = guard((type, payload) => {
		if (type === NEXT) {
			sent += step
			if (isGT ? sent <= end : sent >= end) {
				sink(NEXT, sent)
			} else if (isGT ? sent > end : sent < end) {
				callback(FINISH)
			}
		} else {
			sink(type, payload)
		}
	})
	return callback
}

export const fromAction = actionType => sink => {
	let callback = guard((type, payload) => {
		if (type === actionType) {
			sink(NEXT, payload)
		} else if (type === NEXT) {
			return
		} else {
			sink(type, payload)
		}
	})
	return callback
}