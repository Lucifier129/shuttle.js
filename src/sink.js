import { START, NEXT, FINISH, ASYNC, ERROR } from './constant'
import { guard, log } from './utility'

export const onType = theType => handler => source => sink => {
	return source((type, payload) => {
		if (type === theType) {
			handler && handler(payload)
		}
		sink(type, payload)
	})
}

export const onStart = onType(START)
export const onNext = onType(NEXT)
export const onFinish = onType(FINISH)
export const onAsync = onType(ASYNC)
export const onError = onType(ERROR)

export const observe = ({ start, next, finish, async, error }) => source =>
	source |> onStart(start) |> onNext(next) |> onFinish(finish) |> onAsync(async) |> onError(error)

export const toCallback = source => {
	let callback = source((type, payload) => {
		if (type === START) {
			callback(NEXT)
		} else if (type === NEXT) {
			callback(NEXT)
		}
	})
	return callback
}

export const start = source => {
	let callback = toCallback(source)
	callback(START)
	return callback
}
