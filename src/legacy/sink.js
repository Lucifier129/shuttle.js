import { mapValue, makeSink } from './utility'

export const fork = theSink => source =>
  source.make(sink => {
    let finalSink = mapValue(makeSink(sink), (fn, key) => value => {
      theSink[key](value)
      fn(value)
    })
    return source(finalSink)
  })

export const toAction = sink => source => source(makeSink(sink))

export const run = sink => source => {
  if (typeof sink === 'function') sink = { next: sink }
  let action = toAction(sink)(source)
  action.start()
  return action
}

export const on = name => f => source =>
  source.make(sink => {
    return source({
      ...sink,
      [name]: value => {
        f(value)
        sink[name](value)
      }
    })
  })

export const onStart = on('start')
export const onNext = on('next')
export const onFinish = on('finish')
export const onError = on('error')
