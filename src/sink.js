import { START, NEXT, FINISH, ERROR } from './constant'
import { guard, log } from './utility'

export const onType = theType => handler => source => sink => {
  let callback = source((type, payload) => {
    if (type === theType) {
      handler && handler(payload, callback)
    }
    sink(type, payload)
  })
  return callback
}

export const onStart = onType(START)
export const onNext = onType(NEXT)
export const onFinish = onType(FINISH)
export const onError = onType(ERROR)

export const observe = ({ start, next, finish, error }) => source =>
  source
  |> onStart(start)
  |> onNext(next)
  |> onFinish(finish)
  |> onError(error)

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
