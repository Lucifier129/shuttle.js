const identity = x => x
const noop = () => {}
const pipe = (...args) => args.reduce((a, f) => f(a))

const empty = () => sink => {
  let complete = () => {
    sink.complete()
  }
  let next = () => {
    complete()
  }
  return { next, complete }
}

const of = (...valueList) => sink => {
  let index = 0
  let next = () => {
    if (index === valueList.length) {
      complete()
    } else {
      sink.next(valueList[index++])
    }
  }
  let complete = () => {
    sink.complete()
  }

  return { next, complete }
}

const unit = value => of(value)

// const map = f => source => sink =>
//   source({
//     ...sink,
//     next: value => sink.next(f(value))
//   })

// const concat = source => sink => {
//   let list = []
//   let isComplete = false
//   let handler = source({
//     next: value => {
//       list.push(value)
//       consume()
//     },
//     complete: () => {
//       isComplete = true
//       if (!innerHandler && !list.length) {
//         sink.complete()
//       }
//     }
//   })
//   let innerHandler = null
//   let consume = () => {
//     if (!list.length && isComplete) {
//       sink.complete()
//       return
//     }
//     if (!list.length) return
//     let currentSource = list.shift()
//     innerHandler = currentSource({
//       next: sink.next,
//       complete: () => {
//         innerHandler = null
//         consume()
//       }
//     })
//     innerHandler.next()
//   }
//   let next = () => {
//     if (innerHandler) {
//       innerHandler.next()
//     } else {
//       handler.next()
//     }
//   }
//   let complete = () => {
//     list.length = 0
//     if (innerHandler) {
//       let innerComplete = innerHandler.complete
//       innerHandler = null
//       innerComplete()
//     }
//     handler.complete()
//   }
//   return { next, complete }
// }

// const bind = f => source =>
//   pipe(
//     source,
//     map(f),
//     concat
//   )

const bind = f => source => sink => {
  let innerHandler = null
  let next = () => {
    if (isComplete) return
    if (innerHandler) {
      innerHandler.next()
    } else {
      handler.next()
    }
  }
  let complete = () => {
    valueList.length = 0
    if (innerHandler) {
      let innerComplete = innerHandler.complete
      innerHandler = null
      innerComplete()
    }
    if (!isComplete) {
      handler.complete()
    }
  }
  let consumeInnerSource = () => {
    if (valueList.length === 0 || innerHandler) return

    let value = valueList.shift()
    let innerSource = f(value)
    let innerSink = {
      next: sink.next,
      complete: () => {
        innerHandler = null
        if (valueList.length > 0) {
          consumeInnerSource()
        } else if (isComplete) {
          sink.complete()
        } else {
          handler.next()
        }
      }
    }
    innerHandler = innerSource(innerSink)
    innerHandler.next()
  }
  let valueList = []
  let isComplete = false
  let handler = source({
    next: value => {
      valueList.push(value)
      consumeInnerSource()
    },
    complete: () => {
      isComplete = true
      if (!valueList.length && !innerHandler) {
        sink.complete()
      }
    }
  })

  return { next, complete }
}

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
const map = f => source => apply(unit(f), source)

const applyAll = (...args) => args.reduce(apply)

const sequence = (sourceList = []) =>
  pipe(
    of(...sourceList),
    bind(identity)
  )

const take = max => source => sink => {
  let count = 0
  let next = () => {
    if (count >= max || !max) {
      handler.complete()
    } else {
      handler.next()
    }
  }
  let handler = source({
    ...sink,
    next: value => {
      count += 1
      sink.next(value)
      if (count >= max) {
        handler.complete()
      }
    }
  })
  return { next, complete: handler.complete }
}

const filter = predicate => source => sink => {
  let handler = source({
    ...sink,
    next: value => {
      if (predicate(value)) {
        sink.next(value)
      } else {
        handler.next()
      }
    }
  })
  return handler
}

const scan = (f, acc) => source => sink =>
  source({
    ...sink,
    next: value => {
      acc = f(acc, value)
      sink.next(acc)
    }
  })

const foreach = (next = noop, complete = noop) => source => {
  let handler = source({
    next: value => {
      next(value)
      handler.next()
    },
    complete
  })
  handler.next()
  return handler.complete
}

const log = foreach(
  value => {
    console.log('next', value)
  },
  () => {
    debugger
    console.log('complete')
  }
)

const interval = period => sink => {
  let count = 0
  let timer = setInterval(() => sink.next(count++), period)
  let next = () => {}
  let complete = () => {
    clearInterval(timer)
    sink.complete()
  }
  return { next, complete }
}

const range = (start, end) => sink => {
  let count = start
  let next = () => {
    if (count <= end) {
      sink.next(count++)
    } else {
      complete()
    }
  }
  let complete = () => {
    sink.complete()
  }
  return { next, complete }
}

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
  source1
  // of('0-0-1-0-1-2'),
  // source2,
  // of('0-1-2-0-1-2-0-1-2'),
  // source3,
  // of('0-1-0-1-2-0-1-2-3'),
  // source4
]

pipe(
  sequence(sourceList),
  log
)
