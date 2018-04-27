
const START = 0
const NEXT = 1
const FINISH = 2
const ASYNC = 3

const pipe = (...args) => args.reduce((result, f) => f(result))
const bind = f => source => sink => source((type, payload) => f(sink, type, payload))
const run = f => source => {
	let callback = source((type, payload) => {
		if (type === START) {
			callback(NEXT)
		} else if (type === NEXT) {
			f(payload)
			callback(NEXT)
		}
	})
	callback(START)
	return callback
}

const interval = period => sink => {
	let timer
	let i = 0
	return (type, payload) => {
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
	}
}

pipe(
	interval(100),
	bind((sink, type, payload) => {
		if (type === NEXT) {
			sink(type, payload + 1)
		} else {
			sink(type, payload)
		}
	}),
	run(x => console.log(x))
)
