import { START, NEXT, FINISH, ASYNC } from './constant'
import { guard, log } from './utility'

export const interval = period => sink => {
	let timer
	let i = 0
	return guard((type, payload) => {
		if (type === START) {
			timer = setInterval(() => sink(NEXT, i++), period)
			sink(START)
		} else if (type === FINISH) {
			clearInterval(timer)
			sink(FINISH)
		} else if (type === NEXT) {
			sink(ASYNC)
		} else {
			sink(type, payload)
		}
	})
}

export const fromArray = array => sink => {
	let i = 0
	let callback = guard((type, payload) => {
		if (type === NEXT) {
			if (i < array.length) {
				sink(NEXT, array[i++])
				if (i === array.length) {
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
