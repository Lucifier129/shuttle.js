import { guard, mapValue, makeSink } from './utility'

export const fork = theSink => source => sink => {
  let combineSink = mapValue(sink, (key, fn) => value => {
    theSink[key](value)
    fn(value)
  })
  return source(makeSink(combineSink))
}

export const toAction = sink => source => source(makeSink(sink))

export const run = sink => source => {
  if (typeof sink === 'function') sink = { next: sink }
  let action = toAction(sink)(source)
  action.start()
  return action
}

export const on = name => f => source => {
  if (!source) debugger
  return sink => {
    return source({
      ...sink,
      [name]: value => {
        f(value)
        sink[name](value)
      }
    })
  }
}

export const onStart = on('start')
export const onNext = on('next')
export const onFinish = on('finish')
export const onError = on('error')
