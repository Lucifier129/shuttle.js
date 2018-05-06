import {
  log,
  logValue,
  logAll,
  noop,
  identity,
  makeSink,
  isObject,
  isSource
} from './utility'
import { run, fork, toAction, onStart, onNext, onFinish, onError } from './sink'
import { fromEvent, fromArray, fromRange, interval, of, create } from './source'

const EMPTY = {}

const consume = make =>
  create(callback => {
    let count = 0
    let innerAction = null
    let innerSink = {
      next: callback.next,
      error: callback.error,
      finish: () => {
        innerAction = null
        doMake()
      }
    }
    let doMake = () => {
      if (finished) return
      let makedSource
      try {
        makedSource = make(count++)
      } catch (error) {
        return callback.error(error)
      }
      if (!makedSource) return callback.finish()
      innerAction = makedSource(innerSink)
      innerAction.start()
    }
    let start = doMake
    let finished = false
    let finish = () => {
      finished = true
      innerAction && innerAction.finish()
    }
    return { start, finish }
  })

export const concat = (...sourceList) => consume(count => sourceList[count])
export const concatSource = source2 => source1 => concat(source1, source2)
export const concatBy = (...makeList) =>
  consume(count => {
    let make = makeList[count]
    return make ? make(count) : null
  })
export const concatSourceBy = make => source => concatBy(() => source, make)

export const merge = (...sourceList) =>
  create(callback => {
    let finishCount = 0
    let innerSink = {
      next: callback.next,
      error: callback.error,
      finish: () => ++finishCount === sourceList.length && callback.finish()
    }
    let actionList = sourceList.map(source => source(innerSink))
    let start = () => actionList.forEach(innerAction => innerAction.start())
    let finish = () => actionList.forEach(innerAction => innerAction.finish())
    return { start, finish }
  })

export const mergeWith = source2 => source1 => merge(source1, source2)

export const combine = (...sourceList) =>
  create(callback => {
    let finishCount = 0
    let innerFinish = () =>
      ++finishCount === sourceList.length && callback.finish()
    let valueList = new Array(sourceList.length)
    let actionList = sourceList.map((source, index) => {
      valueList[index] = EMPTY
      return source({
        next: value => {
          valueList[index] = value
          if (valueList.indexOf(EMPTY) === -1) {
            callback.next(valueList.concat())
          }
        },
        finish: innerFinish,
        error: callback.error
      })
    })
    let start = () => actionList.forEach(innerAction => innerAction.start())
    let finish = () => actionList.forEach(innerAction => innerAction.finish())
    return { start, finish }
  })

export const combineWith = source2 => source1 => combine(source1, source2)

export const fromArrayShape = array => combine(...array.map(fromShape))
export const fromObjectShape = obj => {
  let keys = Object.keys(obj)
  let sourceList = keys.map(key => fromShape(obj[key]))
  let construct = (result, value, index) => {
    result[keys[index]] = value
    return result
  }
  let toShape = valueList => valueList.reduce(construct, {})
  return combine(...sourceList) |> map(toShape)
}

export const fromShape = shape => {
  if (Array.isArray(shape)) {
    return fromArrayShape(shape)
  } else if (isObject(shape)) {
    return fromObjectShape(shape)
  }
  return shape
}

export const map = f => source => sink =>
  source({
    ...sink,
    next: value => sink.next(f(value))
  })

export const mapTo = value => map(() => value)

export const filter = f => source => sink =>
  source({
    ...sink,
    next: value => f(value) && sink.next(value)
  })

export const take = (max = 0) => source => sink => {
  let count = 0
  let action = source({
    ...sink,
    next: value => {
      if (count === max) return action.finish()
      count += 1
      sink.next(value)
    }
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

export const keep = (size = 2, start = size - 1) => source => {
  let accumulate = (list, value) => {
    let newList = list.slice(list.length === size ? start : 0)
    newList.push(value)
    return newList
  }
  return source |> scan(accumulate, []) |> filter(list => list.length === size)
}

export const skip = (count = 0) => {
  return filter(() => {
    if (count === 0) return true
    count -= 1
    return false
  })
}

export const takeUntil = until$ => source => sink => {
  let start = () => {
    innerAction.start()
    untilAction.start()
  }
  let finished = false
  let finish = () => {
    if (finished) return
    finished = true
    innerAction.finish()
    untilAction.finish()
  }
  let innerAction = source(sink)
  let untilAction = until$({ next: finish })
  return { start, finish }
}

export const takeLast = (count = 1) => source => sink => {
  let list = []
  return (
    source
    |> onNext(value => {
      list.push(value)
      if (list.length > count) list.shift()
    })
    |> concatSourceBy(() => fromArray(list) |> onNext(sink.next))
    |> toAction({
      start: sink.start,
      finish: sink.finish,
      error: sink.error
    })
  )
}

export const then = make => source => sink => {
  let lastValue = EMPTY
  return (
    source
    |> onNext(value => sink.next((lastValue = value)))
    |> concatSourceBy(
      () => lastValue !== EMPTY && (make(lastValue) |> onNext(sink.next))
    )
    |> toAction({
      start: sink.start,
      finish: sink.finish,
      error: sink.error
    })
  )
}

export const switchMap = makeSource => source => sink => {
  let innerAction = null
  let innerSink = { next: sink.next, error: sink.error }
  return source({
    ...sink,
    next: value => {
      innerAction && innerAction.finish()
      try {
        innerAction = makeSource(value)(innerSink)
        innerAction.start()
      } catch (error) {
        sink.error(error)
      }
    },
    finish: () => {
      innerAction && innerAction.finish()
      sink.finish()
    }
  })
}

export const reduce = (f, seed) => source => sink => {
  return source |> scan(f, seed) |> takeLast() |> toAction(sink)
}

export const startWith = value => source => concat(of(value), source)
