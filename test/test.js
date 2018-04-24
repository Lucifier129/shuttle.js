import { START, NEXT, FINISH, ASYNC, ERROR } from '../src/constant'
import { guard, log, logValue } from '../src/utility'
import { interval, fromArray } from '../src/source'
import { map, filter, take, merge, concat, combine, takeUntil, share, switchMap } from '../src/operator'
import { onType, onStart, onNext, onFinish, onAsync, start } from '../src/sink'

test('check letant value', () => {
	expect(START).toBe(0)
	expect(NEXT).toBe(1)
	expect(FINISH).toBe(2)
	expect(ASYNC).toBe(3)
	expect(ERROR).toBe(4)
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
		|> start
})

test('fromArray source', done => {
	let list = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
	fromArray([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
		|> onNext(n => expect(n).toBe(list.shift()))
		|> onFinish(() => {
			expect(list.length).toBe(0)
			done()
		})
		|> start
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
		|> start
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
		|> start
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
		|> start
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
		|> start
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
		|> start
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
		|> start
})

test('share operator', done => {
	let interval$ = interval(10) |> share
	let list1 = [0, 1, 2]
	let list2 = [2, 3, 4]
	interval$
		|> take(3)
		|> onNext(n => {
			expect(n).toBe(list1.shift())
			if (n === 1) {
				interval$
					|> take(3)
					|> onNext(n => expect(n).toBe(list2.shift()))
					|> onFinish(() => {
						expect(list2.length).toBe(0)
						done()
					})
					|> start
			}
		})
		|> onFinish(() => {
			expect(list1.length).toBe(0)
		})
		|> start
})

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
		|> start
})

test('custom action', done => {
	let DOWN = Symbol('down')
	let MOVE = Symbol('move')
	let UP = Symbol('up')
	let source = sink => {
		let callback = guard((type, payload) => {
			if (type === DOWN || type === MOVE) {
				sink(NEXT, payload)
			} else if (type === UP) {
				callback(FINISH)
			} else if (type === NEXT) {
				sink(ASYNC)
			} else {
				sink(type, payload)
			}
		})
		return callback
	}
	let actionList = [
		{ type: DOWN, payload: 0 },
		{ type: MOVE, payload: 1 },
		{ type: MOVE, payload: 2 },
		{ type: MOVE, payload: 3 },
		{ type: MOVE, payload: 4 },
		{ type: MOVE, payload: 5 },
		{ type: UP }
	]
	let list = [0, 1, 2, 3, 4, 5]
	let callback =
		source
		|> onNext(n => expect(n).toBe(list.shift()))
		|> onFinish(() => {
			expect(list.length).toBe(0)
			done()
		})
		|> start
	actionList.forEach(({ type, payload }) => callback(type, payload))
})
