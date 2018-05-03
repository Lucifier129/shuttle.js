import { guard, log, logValue, noop, identity, makeSink } from './utility'
import { run, fork, toAction, onStart, onNext, onFinish, onError } from './sink'
import { fromEvent, fromArray, fromRange, interval, of } from './source'

const consume = make => sink => {
  let count = 0
  let innerAction = null
  let innerSink = makeSink({
    next: sink.next,
    error: sink.error,
    finish: () => {
      innerAction = null
      outerAction && doMake()
    }
  })
  let doMake = () => {
    let makedSource = make(count++)
    if (!makedSource) return outerAction.finish()
    innerAction = makedSource(innerSink)
    innerAction.start()
  }
  let outerAction = guard({
    start: () => {
      sink.start()
      doMake()
    },
    finish: () => {
      outerAction = null
      innerAction && innerAction.finish()
      sink.finish()
    }
  })
  return outerAction
}

export const concat = (...sourceList) => consume(count => sourceList[count])
export const concatSource = source2 => source1 => concat(source1, source2)
export const concatBy = (...makeList) =>
  consume(count => {
    let make = makeList[count]
    return make ? make(count) : null
  })
export const concatSourceBy = make => source => concatBy(() => source, make)

export const merge = (...sourceList) => sink => {
  let finishCount = 0
  let innerSink = makeSink({
    next: sink.next,
    error: sink.error,
    finish: () => {
      if (++finishCount === sourceList.length) action.finish()
    }
  })
  let actionList = sourceList.map(source => source(innerSink))
  let action = guard({
    start: () => {
      actionList.forEach(innerAction => innerAction.start())
      sink.start()
    },
    finish: () => {
      actionList.forEach(innerAction => innerAction.finish())
      sink.finish()
    }
  })
  return action
}

export const mergeWith = source2 => source1 => merge(source1, source2)

const EMPTY = {}
export const combine = (...sourceList) => sink => {
  let finishCount = 0
  let innerFinish = () => {
    if (++finishCount === sourceList.length) action.finish()
  }
  let valueList = new Array(sourceList.length)
  let actionList = sourceList.map((source, index) => {
    let innerSink = makeSink({
      next: value => {
        valueList[index] = value
        if (valueList.indexOf(EMPTY) === -1) {
          sink.next(valueList.concat())
        }
      },
      finish: innerFinish,
      error: sink.error
    })
    valueList[index] = EMPTY
    return source(innerSink)
  })
  let action = guard({
    start: () => {
      actionList.forEach(innerAction => innerAction.start())
      sink.start()
    },
    finish: () => {
      actionList.forEach(innerAction => innerAction.finish())
      sink.finish()
    }
  })
  return action
}

export const combineWith = source2 => source1 => combine(source1, source2)

export const combineObject = shape => {
  let keys = Object.keys(shape)
  let sourceList = keys.map(key => shape[key])
  return (
    combine(...sourceList)
    |> map(valueList => {
      return valueList.reduce((result, value, index) => {
        result[keys[index]] = value
        return result
      }, {})
    })
  )
}

export const map = f => source => sink => {
  return source({
    ...sink,
    next: value => sink.next(f(value))
  })
}

export const mapTo = value => map(() => value)

export const filter = f => source => sink => {
  return source({
    ...sink,
    next: value => f(value) && sink.next(value)
  })
}

export const take = (max = 0) => source => sink => {
  let count = 0
  let next = value => {
    count += 1
    sink.next(value)
    if (count === max) action.finish()
  }
  let action = source({
    ...sink,
    next
  })
  return action
}

export const scan = (f, seed) => source => sink => {
  let acc = seed
  let next = value => sink.next((acc = f(acc, value)))
  return source({
    ...sink,
    next
  })
}

export const skip = (count = 0) => {
  return filter(() => {
    if (count === 0) return true
    count -= 1
    return false
  })
}

export const takeUntil = until$ => source => sink => {
  let action = source(sink)
  let start = () => {
    action.start()
    untilAction.start()
  }
  let finish = () => {
    action.finish()
    untilAction.finish()
  }
  let untilAction = until$(makeSink({ next: finish }))
  return guard({
    start,
    finish
  })
}

export const takeLast = (count = 1) => source => sink => {
  let list = []
  let innerSink = makeSink({
    next: value => {
      list.push(value)
      if (list.length > count) list.shift()
    },
    finish: () => {
      if (!action) return
      action = fromArray(list)(sink)
      action.start()
    }
  })
  let action = source(innerSink)
  return guard({
    start: action.start,
    finish: () => {
      let finish = action.finish
      action = null
      finish()
    }
  })
}

export const switchMap = makeSource => source => sink => {
  let innerAction = null
  let innerSink = makeSink({
    next: sink.next
  })
  return source({
    ...sink,
    next: value => {
      innerAction && innerAction.finish()
      innerAction = makeSource(value)(innerSink)
      innerAction.start()
    },
    finish: () => {
      innerAction && innerAction.finish()
      sink.finish()
    }
  })
}

export const then = make => source => sink => {
  return (
    source
    |> onNext(sink.next)
    |> takeLast()
    |> switchMap(make)
    |> toAction(sink)
  )
}

export const reduce = (f, seed) => source => sink => {
  return (
    source
    |> scan(f, seed)
    |> then(list => of(list) |> fork(sink))
    |> toAction()
  )
}

export const startWith = value => source => concat(of(value), source)
