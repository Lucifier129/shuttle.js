import { guard, log, logValue, logAll } from '../src/utility'
import { create, interval, fromArray, fromRange, fromEvent } from '../src/source'
import { onStart, onNext, onFinish, onError, run } from '../src/sink'
import {
	map,
	filter,
	take,
	merge,
	concat,
	combine,
	combineObject,
	takeUntil,
	// share,
	switchMap,
	startWith,
	takeLast,
	then
} from '../src/operator'
import EventEmiter from 'events'

test('create source: async', done => {
	let timer = null
	let count = 0
	let producer = {
		start: (next, finish) => {
			timer = setInterval(() => {
				next(count++)
				if (count > 2) finish()
			}, 10)
		},
		finish: () => {
			clearInterval(timer)
		}
	}
	let list = [0, 1, 2, 3]
	create(producer)
		|> onNext(n => expect(n).toBe(list.shift()))
		|> onFinish(() => {
			expect(list.length).toBe(0)
			done()
		})
		|> run()
})

test('interval source', done => {
	let list = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
	interval(10)
		|> take(10)
		|> onNext(n => expect(n).toBe(list.shift()))
		|> onFinish(() => {
			expect(list.length).toBe(0)
			done()
		})
		|> run()
})

test('fromArray source', done => {
	let list = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
	fromArray([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
		|> onNext(n => expect(n).toBe(list.shift()))
		|> onFinish(() => {
			expect(list.length).toBe(0)
			done()
		})
		|> run()
})

test('fromRange source: increment', done => {
	let list = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
	fromRange(0, 9)
		|> onNext(n => expect(n).toBe(list.shift()))
		|> onFinish(() => {
			expect(list.length).toBe(0)
			done()
		})
		|> run()
})

test('fromRange source: decrement', done => {
	let list = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].reverse()
	fromRange(9, 0, -1)
		|> onNext(n => expect(n).toBe(list.shift()))
		|> onFinish(() => {
			expect(list.length).toBe(0)
			done()
		})
		|> run()
})

test('fromRange source: alphabet', done => {
	let list = 'abcdefghijklmnopqrstuvwxyz'.split('')
	fromRange(97, 122)
		|> map(String.fromCharCode)
		|> onNext(n => expect(n).toBe(list.shift()))
		|> onFinish(() => {
			expect(list.length).toBe(0)
			done()
		})
		|> run()
})

test('take operator', done => {
	let list = [0, 1, 2, 3, 4]
	fromArray([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
		|> take(list.length)
		|> onNext(n => expect(n).toBe(list.shift()))
		|> onFinish(() => {
			expect(list.length).toBe(0)
			done()
		})
		|> run()
})

test('map operator', done => {
	let list = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
	fromArray([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
		|> map(n => n + 1)
		|> onNext(n => expect(n).toBe(list.shift() + 1))
		|> onFinish(() => {
			expect(list.length).toBe(0)
			done()
		})
		|> run()
})

test('filter operator', done => {
	let list = [1, 3, 5, 7, 9]
	fromArray([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
		|> filter(n => n % 2 === 1)
		|> onNext(n => expect(n).toBe(list.shift()))
		|> onFinish(() => {
			expect(list.length).toBe(0)
			done()
		})
		|> run()
})

test('merge operator', done => {
	let list = [0, 1, 2, 0, 3]
	merge(interval(100), interval(350))
		|> take(5)
		|> onNext(n => expect(n).toBe(list.shift()))
		|> onFinish(() => {
			expect(list.length).toBe(0)
			done()
		})
		|> run()
})

test('concat operator', done => {
	let list = [0, 1, 2, 3, 0, 1]
	concat(fromArray([0, 1]), fromArray([2, 3]), interval(10))
		|> take(6)
		|> onNext(n => expect(n).toBe(list.shift()))
		|> onFinish(() => {
			expect(list.length).toBe(0)
			done()
		})
		|> run()
})

test('combine operator', done => {
	let list = [[1, 3, 0], [1, 3, 1], [1, 3, 2], [1, 3, 3]]
	combine(fromArray([0, 1]), fromArray([2, 3]), interval(10))
		|> take(4)
		|> onNext(n => expect(n).toEqual(list.shift()))
		|> onFinish(() => {
			expect(list.length).toBe(0)
			done()
		})
		|> run()
})

// test('share operator', done => {
// 	let interval$ = interval(10) |> share
// 	let list1 = [0, 1, 2]
// 	let list2 = [2, 3, 4]
// 	interval$
// 		|> take(3)
// 		|> onNext(n => {
// 			expect(n).toBe(list1.shift())
// 			if (n === 1) {
// 				interval$
// 					|> take(3)
// 					|> onNext(n => expect(n).toBe(list2.shift()))
// 					|> onFinish(() => {
// 						expect(list2.length).toBe(0)
// 						done()
// 					})
// 					|> run()
// 			}
// 		})
// 		|> onFinish(() => {
// 			expect(list1.length).toBe(0)
// 		})
// 		|> run()
// })

test('takeUntil operator', done => {
	let list = [0, 1, 2, 3]
	interval(10)
		|> takeUntil(interval(48) |> onNext(n => expect(n).toBe(0)))
		|> onNext(n => {
			expect(n).toBe(list.shift())
		})
		|> onFinish(() => {
			expect(list.length).toBe(0)
			done()
		})
		|> run()
})

test('custom action', done => {
	let emitter = new EventEmiter()
	let DOWN = Symbol('down')
	let MOVE = Symbol('move')
	let UP = Symbol('up')
	let down$ = fromEvent(emitter, DOWN)
	let move$ = fromEvent(emitter, MOVE)
	let up$ = fromEvent(emitter, UP)
	let source = merge(down$, move$) |> takeUntil(up$)
	let actionList = [
		{ type: DOWN, payload: 0 },
		{ type: MOVE, payload: 1 },
		{ type: MOVE, payload: 2 },
		{ type: MOVE, payload: 3 },
		{ type: MOVE, payload: 4 },
		{ type: MOVE, payload: 5 },
		{ type: UP },
		{ type: MOVE, payload: 6 }
	]
	let list = [0, 1, 2, 3, 4, 5]
	let callback =
		source
		|> onNext(n => expect(n).toBe(list.shift()))
		|> onFinish(() => {
			expect(list.length).toBe(0)
			done()
		})
		|> run()
	actionList.forEach(({ type, payload }) => emitter.emit(type, payload))
})

test('switchMap operator: async & sync', done => {
	let list = [0, 1, 0, 1, 2, 0, 1, 2, 3]
	interval(10)
		|> take(4)
		|> switchMap(n => fromRange(0, n))
		|> onNext(n => expect(n).toBe(list.shift()))
		|> onFinish(() => {
			expect(list.length).toBe(0)
			done()
		})
		|> run()
})

test('switchMap operator: both sync', done => {
	let list = [2, 3, 4, 3, 4, 5, 4, 5, 6]
	fromArray([1, 2, 3])
		|> switchMap(n => fromArray([n + 1, n + 2, n + 3]))
		|> onNext(n => expect(n).toBe(list.shift()))
		|> onFinish(() => {
			expect(list.length).toBe(0)
			done()
		})
		|> run()
})

test('switchMap operator: sync & async', done => {
	let list = [1, 2, 3]
	fromArray([1, 2, 3])
		|> onNext(n => expect(n).toBe(list.shift()))
		|> switchMap(n => interval(10) |> take(2) |> map(count => count + n))
		|> onNext(n => {
			throw new Error('never here')
		})
		|> onFinish(() => {
			expect(list.length).toBe(0)
			done()
		})
		|> run()
})

test('switchMap operator: last', done => {
	let list = [2, 3, 4]
	fromArray([1])
		|> switchMap(n => fromArray([n + 1, n + 2, n + 3]))
		|> onNext(n => expect(n).toBe(list.shift()))
		|> onFinish(() => {
			expect(list.length).toBe(0)
			done()
		})
		|> run()
})

// test('switchMap operator: resultSelector', done => {
//   let list = [2, 3, 4]
//   fromArray([1])
//     |> switchMap(n => fromArray([n + 1, n + 2, n + 3]))
//     |> onNext(n => expect(n).toBe(list.shift()))
//     |> onFinish(() => {
//       expect(list.length).toBe(0)
//       done()
//     })
//     |> run()
// })

test('combineObject operator', done => {
	let shape = {
		a: interval(10),
		b: interval(35)
	}
	let list = [{ a: 2, b: 0 }, { a: 3, b: 0 }]
	combineObject(shape)
		|> take(2)
		|> onNext(n => expect(n).toEqual(list.shift()))
		|> onFinish(() => {
			expect(list.length).toBe(0)
			done()
		})
		|> run()
})

test('startWith operator', done => {
	let list = [10, 0, 1]
	fromRange(0, 1)
		|> take(2)
		|> startWith(list[0])
		|> onNext(n => expect(n).toEqual(list.shift()))
		|> onFinish(() => {
			expect(list.length).toBe(0)
			done()
		})
		|> run()
})

test('takeLast operator: single', done => {
	fromRange(0, 10)
		|> takeLast()
		|> onNext(n => expect(n).toBe(10))
		|> onFinish(() => {
			done()
		})
		|> run()
})

test('takeLast operator: multiple', done => {
	let list = [6, 7, 8, 9, 10]
	fromRange(0, 10)
		|> takeLast(5)
		|> onNext(n => expect(n).toBe(list.shift()))
		|> onFinish(() => {
			done()
		})
		|> run()
})

test('then operator', done => {
	let list1 = [6, 7, 8, 9, 10]
	let list2 = [10, 9, 8, 7, 6]
	let list3 = [6, 7, 8, 9, 10, 10, 9, 8, 7, 6]
	fromRange(0, 10)
		|> takeLast(5)
		|> onNext(n => expect(n).toBe(list1.shift()))
		|> then(n => {
			expect(n).toBe(10)
			return fromRange(10, 6, -1) |> onNext(n => expect(n).toBe(list2.shift()))
		})
		|> onNext(n => {
			expect(n).toBe(list3.shift())
		})
		|> onFinish(() => {
			expect(list1.length).toBe(0)
			expect(list2.length).toBe(0)
			expect(list3.length).toBe(0)
			done()
		})
		|> run()
})
