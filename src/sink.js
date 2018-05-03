import { guard, mapValue } from './utility'

export const fork = theSink => source => sink => {
	let combineSink = mapValue(sink, (key, fn) => value => {
		theSink[key](value)
		fn(value)
	})
	return source(combineSink)
}

export const pullable = (sink = {}) => source => {
	let start = () => {
		sink.start && sink.start()
		action.next()
	}
	let next = value => {
		sink.next && sink.next(value)
		action.next()
	}
	let finish = () => {
		sink.finish && sink.finish()
	}
	let action = source({
		...sink,
		start,
		next,
		finish
	})
	return action
}

export const run = sink => source => {
	if (typeof sink === 'function') sink = { next: sink }
	let action = pullable(sink)(source)
	action.start()
	return action
}

export const on = name => f => source => sink => {
	return source({
		...sink,
		[name]: value => {
			f(value)
			sink[name](value)
		}
	})
}

export const onStart = on('start')
export const onNext = on('next')
export const onFinish = on('finish')
export const onError = on('error')
