const pipe = (...args) => args.reduce((result, f) => f(result))

const identity = x => x

const from = value => sink => sink(value)

const map = f => source => sink => source(value => sink(f(value)))

const apply = sourceA => sourceB => sink => sourceA(value => sourceB(f => sink(f(value))))

const then = f => source => sink => map(f)(source)(nextSource => nextSource(sink))

const fromArray = array => sink => array.forEach(value => sink(value))

const interval = period => sink => {
	let i = 0
	let id = setInterval(() => sink(i++), period)
	return () => {
		clearInterval(id)
	}
}

const run = f => source =>
	source(value => {
		f(value)
		return value
	})

let stop = pipe(
	interval(100),
	// from(2),
	// fromArray([1, 2, 3, 4]),
	map(x => x + 1),
	map(x => y => x + y),
	apply(from(2)),
	then(x => from(x * 2)),
	run(x => console.log('x', x))
)

setTimeout(stop, 3000)
