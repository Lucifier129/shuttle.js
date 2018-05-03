import { guard, log, logValue, noop } from './utility'

export const empty = sink => {
  return guard({
    start: sink.start,
    finish: sink.finish
  })
}

export const interval = (period = 1000) => sink => {
  let i = 0
  let timer = null
  let start = () => {
    timer = setInterval(() => sink.next(i++), period)
    sink.start()
  }
  let finish = () => {
    clearInterval(timer)
    sink.finish()
  }
  return guard({ start, finish })
}

const eventMethodList = [
  ['addEventListener', 'removeEventListener'],
  ['addListener', 'removeListener'],
  ['subscribe', 'unsubscribe'],
  ['on', 'off']
]
const findEventMethod = emitter => {
  let methodList = eventMethodList.filter(item => item[0] in emitter)[0]
  if (!methodList) throw new Error('unsupport event emitter')
  return methodList
}
export const fromEvent = (emitter, name, ...args) => sink => {
  let [on, off] = findEventMethod(emitter)
  let feed = value => sink.next(value)
  let start = () => {
    emitter[on](name, feed, ...args)
    sink.start()
  }
  let finish = () => {
    emitter[off](name, feed, ...args)
    sink.finish()
  }
  return guard({
    start,
    finish
  })
}

export const fromArray = array => sink => {
  let start = () => {
    sink.start()
    next()
  }
  let i = 0
  let next = () => {
    if (finished) return
    if (i < array.length) {
      sink.next(array[i++])
      next()
    } else if (i === array.length) {
      finish()
    }
  }
  let finished = false
  let finish = () => {
    finished = true
    sink.finish()
  }
  return guard({
    start,
    finish
  })
}

export const of = (...array) => fromArray(array)

export const fromRange = (from = 0, to = 0, step = 1) => sink => {
  if (from === to) return empty(sink)
  let start = () => {
    sink.start()
    next()
  }
  let isGT = to > from
  let sent = from - step
  let next = () => {
    if (finished) return
    sent += step
    if (isGT ? sent <= to : sent >= to) {
      sink.next(sent)
      next()
    } else if (isGT ? sent > to : sent < to) {
      finish()
    }
  }
  let finished = false
  let finish = () => {
    finished = true
    sink.finish()
  }
  return guard({
    start,
    finish
  })
}

export const fromPromise = promise => sink => {
  let start = () => {
    sink.start()
    next()
  }
  let next = () => {
    if (finished) return
    promise.then(
      value => {
        if (finished) return
        sink.next(value)
        finish()
      },
      error => {
        if (finished) return
        sink.error(error)
      }
    )
  }
  let finished = false
  let finish = () => {
    finished = true
    sink.finish()
  }
  return guard({
    start,
    finish
  })
}
