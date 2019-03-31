const identity = x => x
const noop = () => {}
const pipe = (...args) => args.reduce((a, f) => f(a))

const create = producer => sink => {
  let isFinish = false

  let wrap = f => a => {
    if (isFinish) return
    if (f) f(a)
  }

  let consume = wrap(() => {
    if (handler.consume) handler.consume()
  })

  let finish = wrap(() => {
    isFinish = true
    if (handler.finish) handler.finish()
    if (sink.complete) sink.complete(true)
  })

  let complete = wrap(() => {
    isFinish = true
    if (handler.finish) handler.finish()
    if (sink.complete) sink.complete(false)
  })

  let handler = producer({
    next: wrap(sink.next),
    complete: complete
  })

  return { consume, finish }
}

const empty = () =>
  create(sink => {
    return { consume: sink.complete }
  })

const of = (...valueList) =>
  create(sink => {
    let index = 0
    let consume = () => {
      if (index === valueList.length) {
        sink.complete()
      } else {
        sink.next(valueList[index++])
        if (index === valueList.length) {
          sink.complete()
        }
      }
    }

    return { consume }
  })

const unit = value => of(value)

const map = f => source =>
  create(sink =>
    source({
      ...sink,
      next: value => sink.next(f(value))
    })
  )

const concat = source =>
  create(sink => {
    let isComplete = false
    let isFinish = false
    let innerSourceList = []
    let innerHandler = null
    let handler = source({
      next: value => {
        innerSourceList.push(value)

        if (!innerHandler) {
          let innerSource = innerSourceList.shift()
          innerHandler = innerSource(innerSink)
          innerHandler.consume()
        }
      },
      complete: finished => {
        isComplete = true
        isFinish = finished

        if (isFinish) {
          if (innerHandler) innerHandler.finish()
          sink.complete()
        } else {
          if (!innerSourceList.length && !innerHandler) {
            sink.complete()
          }
        }
      }
    })

    let innerSink = {
      next: sink.next,
      complete: () => {
        innerHandler = null
        if (isFinish) return

        if (innerSourceList.length) {
          let innerSource = innerSourceList.shift()
          innerHandler = innerSource(innerSink)
          innerHandler.consume()
        } else if (isComplete) {
          sink.complete()
        } else {
          handler.consume()
        }
      }
    }

    let consume = () => {
      if (innerHandler) {
        innerHandler.consume()
      } else {
        handler.consume()
      }
    }

    let finish = () => {
      handler.finish()
    }

    return { consume, finish }
  })

const bind = f => source =>
  pipe(
    source,
    map(f),
    concat
  )

const apply = (sourceF, sourceA) =>
  pipe(
    sourceF,
    bind(f =>
      pipe(
        sourceA,
        bind(a => unit(f(a)))
      )
    )
  )

const applyAll = (...args) => args.reduce(apply)

const sequence = (sourceList = []) =>
  pipe(
    of(...sourceList),
    concat
  )

const take = max => source =>
  create(sink => {
    let count = 0

    let handler = source({
      ...sink,
      next: value => {
        count += 1
        if (count <= max) {
          sink.next(value)
          if (count === max) handler.finish()
        } else {
          handler.finish()
        }
      }
    })

    let consume = () => {
      if (count >= max) {
        handler.finish()
      } else {
        handler.consume()
      }
    }

    return { consume, finish: handler.finish }
  })

const filter = predicate => source =>
  create(sink => {
    let handler = source({
      ...sink,
      next: value => {
        if (predicate(value)) {
          sink.next(value)
        } else {
          handler.consume()
        }
      }
    })
    return handler
  })

const scan = (f, acc) => source =>
  create(sink =>
    source({
      ...sink,
      next: value => {
        acc = f(acc, value)
        sink.next(acc)
      }
    })
  )

const foreach = (next = noop, complete = noop) => source => {
  let handler = source({
    next: value => {
      next(value)
      handler.consume()
    },
    complete
  })

  handler.consume()
  return handler.finish
}

const log = foreach(
  value => {
    console.log('next', value)
  },
  () => {
    console.log('complete')
  }
)

const interval = period =>
  create(sink => {
    let count = 0
    let timer = setInterval(() => sink.next(count++), period)
    let finish = () => {
      clearInterval(timer)
    }
    return { finish }
  })

const range = (start, end) =>
  create(sink => {
    let count = start
    let consume = () => {
      if (count <= end) {
        sink.next(count++)
        if (count === end) sink.complete()
      } else {
        sink.complete()
      }
    }
    return { consume }
  })

// pullable + pushable
let source1 = pipe(
  of(1, 2, 3),
  bind(n =>
    pipe(
      interval(n * 100),
      take(3)
    )
  )
)

// pushable + pullable
let source2 = pipe(
  interval(100),
  take(3),
  bind(n => range(0, n))
)

// pushable + pushable
let source3 = pipe(
  interval(100),
  take(3),
  bind(n => {
    return pipe(
      interval(n * 100),
      take(3)
    )
  })
)

// pullable + pullable
let source4 = pipe(
  of(1, 2, 3),
  bind(n => range(0, n))
)

let sourceList = [
  of('0-1-2-0-1-2-0-1-2'),
  source1,
  of('0-0-1-0-1-2'),
  source2,
  of('0-1-2-0-1-2-0-1-2'),
  source3,
  of('0-1-0-1-2-0-1-2-3'),
  source4
]

pipe(
  sequence(sourceList),
  log
)
