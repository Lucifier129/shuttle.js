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

const interval = period => sink => {
	let i = 0
	let timer = null
	let start = () => {
		timer = setInterval(() => sink.next(), period)
	}
	let next = noop
	let finish = () => {
		clearInterval(timer)
		sink.finish()
	}
	return { ...sink, start, next, finish }
}

const map = f => source => sink => {
	return source({
		...sink,
		next: value => sink.next(f(value))
	})
}

const filter = f => source => sink => {
	return source({
		...sink,
		next: value => f(value) && sink.next(value)
	})
}

const take = max => source => sink => {
	let count = 0
	let next = value => {
		if (count === max) return sink.finish()
		count += 1
		sink.next()
	}
	return source({
		...sink,
		next
	})
}
