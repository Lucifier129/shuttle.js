
const START = 0
const NEXT = 1
const FINISH = 2
const ASYNC = 3

// source :: sink -> callback
// source creator :: any -> source a
// callback :: (type, payload) -> void
// sink :: (type, payload) -> void
// source operator :: any -> source a -> source b
// callack operator :: any -> callback a -> callback b
// sink operator :: any -> sink a -> sink b

// callback a -> callback b
// sink a -> sink b

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


const map = f => callback => (type, payload) => {
	let result = f({ type, payload })
	return callback(result.type, result.payload)
}

const filter = f => callback => (type, payload) => {
	if (f(type, payload)) {
		callback(type, payload)
	}
}

const concat = (...callback)


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
