import { guard, log, logValue, logAll } from '../src/utility'
import { empty, never, create, interval, fromArray, fromRange, fromEvent, of } from '../src/source'
import { onStart, onNext, onFinish, onError, run, toAction } from '../src/sink'
import {
	map,
	filter,
	take,
	merge,
	concat,
	combine,
	fromShape,
	takeUntil,
	// share,
	switchMap,
	startWith,
	takeLast,
	then,
	scan,
	keep,
	buffer,
	share
} from '../src/operator'
import EventEmiter from 'events'

describe('source', () => {
	test('empty', () => {
		let sink = {
			start: jest.fn(),
			next: jest.fn(),
			finish: jest.fn(),
			error: jest.fn()
		}
		let action = empty(sink)
		action.start()
		expect(sink.start).toHaveBeenCalledTimes(1)
		expect(sink.next).toHaveBeenCalledTimes(0)
		expect(sink.finish).toHaveBeenCalledTimes(1)
		expect(sink.error).toHaveBeenCalledTimes(0)
	})

	test('never', () => {
		let sink = {
			start: jest.fn(),
			next: jest.fn(),
			finish: jest.fn(),
			error: jest.fn()
		}
		let action = never(sink)
		action.start()
		expect(sink.start).toHaveBeenCalledTimes(1)
		expect(sink.next).toHaveBeenCalledTimes(0)
		expect(sink.finish).toHaveBeenCalledTimes(0)
		expect(sink.error).toHaveBeenCalledTimes(0)
	})

	test('interval', done => {
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

	test('fromArray', done => {
		let list = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
		fromArray([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
			|> onNext(n => expect(n).toBe(list.shift()))
			|> onFinish(() => {
				expect(list.length).toBe(0)
				done()
			})
			|> run()
	})

	test('fromRange: increment', done => {
		let list = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
		fromRange(0, 9)
			|> onNext(n => expect(n).toBe(list.shift()))
			|> onFinish(() => {
				expect(list.length).toBe(0)
				done()
			})
			|> run()
	})

	test('fromRange: decrement', done => {
		let list = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].reverse()
		fromRange(9, 0, -1)
			|> onNext(n => expect(n).toBe(list.shift()))
			|> onFinish(() => {
				expect(list.length).toBe(0)
				done()
			})
			|> run()
	})

	test('fromRange: alphabet', done => {
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
})

describe('operator', () => {
	test('take', done => {
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

	test('map', done => {
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

	test('filter', done => {
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

	test('merge', done => {
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

	test('concat', done => {
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

	test('combine', done => {
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

	test('takeUntil', done => {
		let list = [0, 1, 2, 3]
		interval(10)
			|> takeUntil(interval(48) |> onNext(n => expect(n).toBe(0)))
			|> onNext(n => expect(n).toBe(list.shift()))
			|> onFinish(() => {
				expect(list.length).toBe(0)
				done()
			})
			|> run()
	})

	test('scan', done => {
		let expected = [[0], [0, 1], [0, 1, 2], [0, 1, 2, 3]]
		interval(10)
			|> take(4)
			|> scan((list, value) => list.concat(value), [])
			|> onNext(n => {
				expect(n).toEqual(expected.shift())
			})
			|> onFinish(() => {
				expect(expected.length).toBe(0)
				done()
			})
			|> run()
	})

	test('keep', done => {
		let expected = [[0], [0, 1], [1, 2], [2, 3], [3, 4]]
		interval(10)
		|> keep()  // default 2
			|> take(5)
			|> onNext(n => {
				expect(n).toEqual(expected.shift())
			})
			|> onFinish(() => {
				expect(expected.length).toBe(0)
				done()
			})
			|> run()
	})

	test('keep with custom size', done => {
		let expected = [
			['a'],
			['a', 'b'],
			['a', 'b', 'c'],
			['b', 'c', 'd'],
			['c', 'd', 'e'],
			['d', 'e', 'f'],
			['e', 'f', 'g']
		]
		fromArray('abcdefg')
			|> keep(3)
			|> onNext(n => {
				expect(n).toEqual(expected.shift())
			})
			|> onFinish(() => {
				expect(expected.length).toBe(0)
				done()
			})
			|> run()
	})

	test('buffer', done => {
		let expected = [[0, 1], [1, 2], [2, 3], [3, 4]]
		interval(10)
			|> buffer()
			|> take(4)
			|> onNext(n => {
				expect(n).toEqual(expected.shift())
			})
			|> onFinish(() => {
				expect(expected.length).toBe(0)
				done()
			})
			|> run()
	})

	test('buffer with start index', done => {
		let expected = [['a', 'b', 'c'], ['c', 'd', 'e'], ['e', 'f', 'g']]
		fromArray('abcdefg')
			|> buffer(3, 2)
			|> onNext(n => {
				expect(n).toEqual(expected.shift())
			})
			|> onFinish(() => {
				expect(expected.length).toBe(0)
				done()
			})
			|> run()
	})

	test('custom event', done => {
		let emitter = new EventEmiter()
		let DOWN = Symbol('down')
		let MOVE = Symbol('move')
		let UP = Symbol('up')
		let down$ = fromEvent(emitter, DOWN)
		let move$ = fromEvent(emitter, MOVE)
		let up$ = fromEvent(emitter, UP)
		let source = merge(down$, move$) |> takeUntil(up$)
		let eventList = [
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
		source
			|> onNext(n => expect(n).toBe(list.shift()))
			|> onFinish(() => {
				expect(list.length).toBe(0)
				done()
			})
			|> run()
		eventList.forEach(({ type, payload }) => emitter.emit(type, payload))
	})

	test('switchMap work with async & sync', done => {
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

	test('switchMap work with both sync', done => {
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

	test('switchMap work with sync & async', done => {
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

	test('switchMap work with one value', done => {
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

	test('fromShape work with flat object', done => {
		let shape = {
			a: interval(10),
			b: interval(35)
		}
		let list = [{ a: 2, b: 0 }, { a: 3, b: 0 }]
		fromShape(shape)
			|> take(2)
			|> onNext(n => expect(n).toEqual(list.shift()))
			|> onFinish(() => {
				expect(list.length).toBe(0)
				done()
			})
			|> run()
	})

	test('fromShape work with nest object', done => {
		let shape = {
			array: [
				10,
				{
					nest: [
						11,
						{
							nest1: of(12)
						}
					]
				},
				of({ value: 123 })
			],
			a: { test: interval(10) },
			b: [interval(35)]
		}
		let list = [
			{
				array: [10, { nest: [11, { nest1: 12 }] }, { value: 123 }],
				a: { test: 2 },
				b: [0]
			},
			{
				array: [10, { nest: [11, { nest1: 12 }] }, { value: 123 }],
				a: { test: 3 },
				b: [0]
			}
		]
		fromShape(shape)
			|> take(2)
			|> onNext(n => expect(n).toEqual(list.shift()))
			|> onFinish(() => {
				expect(list.length).toBe(0)
				done()
			})
			|> run()
	})

	test('startWith', done => {
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

	test('takeLast work with single case', done => {
		fromRange(0, 10)
			|> takeLast()
			|> onNext(n => expect(n).toBe(10))
			|> onFinish(() => {
				done()
			})
			|> run()
	})

	test('takeLast work with multiple case', done => {
		let list = [6, 7, 8, 9, 10]
		fromRange(0, 10)
			|> takeLast(5)
			|> onNext(n => expect(n).toBe(list.shift()))
			|> onFinish(() => {
				done()
			})
			|> run()
	})

	test('then', done => {
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

	test('share', done => {
		let interval$ = interval(10) |> share()
		let list1 = [0, 1, 2, 3, 4, 5]
		let list2 = [3, 4]
		interval$
			|> take(6)
			|> onNext(n => {
				if (n !== 2) return
				interval$ |> take(2) |> run(n => expect(n).toBe(list2.shift()))
			})
			|> onNext(n => expect(n).toBe(list1.shift()))
			|> onFinish(() => {
				interval$
					|> take(1)
					|> run(n => {
						expect(n).toBe(0) // all sink is finish, should re-start
						expect(list1.length).toBe(0)
						expect(list2.length).toBe(0)
						done()
					})
			})
			|> run()
	})

	test('share work with lastValue', done => {
		let interval$ = interval(10) |> take(6) |> share(true)
		let list1 = [0, 1, 2, 3, 4, 5]
		let list2 = [2, 3, 4]
		interval$
			|> onNext(n => {
				if (n !== 2) return
				interval$ |> take(3) |> run(n => expect(n).toBe(list2.shift()))
			})
			|> onNext(n => expect(n).toBe(list1.shift()))
			|> onFinish(() => {
				interval$
					|> take(1)
					|> run(n => {
						expect(n).toBe(0) // all sink is finish, should re-start
						expect(list1.length).toBe(0)
						expect(list2.length).toBe(0)
						done()
					})
			})
			|> run()
	})
})
