import { START, NEXT, FINISH, ASYNC, ERROR } from '../src/constant'
import { guard, log } from '../src/utility'
import { interval, fromArray } from '../src/source'
import { map, filter, take, takeUntil, share, switchMap } from '../src/operator'
import { onType, onStart, onNext, onFinish, onAsync, start } from '../src/sink'

test('check constant value', () => {
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
    |> onFinish(done)
    |> start
})

test('fromArray source', done => {
  let list = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
  fromArray([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    |> onNext(n => expect(n).toBe(list.shift()))
    |> onFinish(done)
    |> start
})

test('take operator', done => {
  let list = [0, 1, 2, 3, 4]
  fromArray([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    |> take(list.length)
    |> onNext(n => expect(n).toBe(list.shift()))
    |> onFinish(done)
    |> start
})

test('map operator', done => {
  let list = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
  fromArray([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    |> map(n => n + 1)
    |> onNext(n => expect(n).toBe(list.shift() + 1))
    |> onFinish(done)
    |> start
})

test('filter operator', done => {
  let list = [1, 3, 5, 7, 9]
  fromArray([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    |> filter(n => n % 2 === 1)
    |> onNext(n => expect(n).toBe(list.shift()))
    |> onFinish(done)
    |> start
})

test('customer action', done => {
  const DOWN = Symbol('down')
  const MOVE = Symbol('move')
  const UP = Symbol('up')
  const source = sink => {
    let callback = guard((type, payload) => {
      if (type === DOWN || type === MOVE) {
        sink(NEXT, payload)
      } else if (type === UP) {
        callback(FINISH)
      } else if (type === START || type === NEXT) {
        sink(ASYNC)
      } else {
        sink(type, payload)
      }
    })
    return callback
  }
  const actionList = [
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
    |> onFinish(done)
    |> start
  actionList.forEach(({ type, payload }) => callback(type, payload))
})
