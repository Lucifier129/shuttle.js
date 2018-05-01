import { START, NEXT, FINISH } from './constant'
import { guard, log, logValue } from './utility'
import { empty, once, fromRange, fromAction, fromArray } from './source'
import { toCallback, start, observe } from './sink'

export const fork = f => source => sink => {
  let callback = source((type, payload) => {
    f(type, payload)
    sink(type, payload)
  })
  return callback
}

export const forkIf = (f, theType) => source => sink => {
  let isMatch = Array.isArray(theType)
    ? type => theType.indexOf(type) !== -1
    : type => type === theType
  let callback = source((type, payload) => {
    if (isMatch(type)) {
      f(type, payload)
    }
    sink(type, payload)
  })
  return callback
}

export const forkIfNot = (f, theType) => source => sink => {
  let isMatch = Array.isArray(theType)
    ? type => theType.indexOf(type) === -1
    : type => type !== theType
  let callback = source((type, payload) => {
    if (isMatch(type)) {
      f(type, payload)
    }
    sink(type, payload)
  })
  return callback
}

export const shuntIf = (f, theType) => source => sink => {
  let isMatch = Array.isArray(theType)
    ? type => theType.indexOf(type) !== -1
    : type => type === theType
  let callback = source((type, payload) => {
    if (isMatch(type)) {
      f(type, payload)
    } else {
      sink(type, payload)
    }
  })
  return callback
}

export const shuntIfNot = (f, theType) => source => sink => {
  let isMatch = Array.isArray(theType)
    ? type => theType.indexOf(type) === -1
    : type => type !== theType
  let callback = source((type, payload) => {
    if (isMatch(type)) {
      f(type, payload)
    } else {
      sink(type, payload)
    }
  })
  return callback
}

export const forkAndSwitchIf = (f, theType, switchType) => {
  let getType = Array.isArray(switchType)
    ? type => switchMap[theType.indexOf(type)]
    : type => switchMap
  return forkIf((type, payload) => f(getType(type), payload), theType)
}

export const forkAndSwitchIfNot = (f, theType, switchType) => {
  let getType = Array.isArray(switchType)
    ? type => switchMap[theType.indexOf(type)]
    : type => switchMap
  return forkIfNot((type, payload) => f(getType(type), payload), theType)
}

export const shuntAndSwitchIf = (f, theType, switchType) => {
  let getType = Array.isArray(switchType)
    ? type => switchMap[theType.indexOf(type)]
    : type => switchMap
  return shuntIf((type, payload) => f(getType(type), payload), theType)
}

export const shuntAndSwitchIfNot = (f, theType, switchType) => {
  let getType = Array.isArray(switchType)
    ? type => switchMap[theType.indexOf(type)]
    : type => switchMap
  return shuntIfNot((type, payload) => f(getType(type), payload), theType)
}

export const map = f => source => sink => {
  return source((type, payload) => {
    sink(type, type === NEXT ? f(payload) : payload)
  })
}

export const mapTo = value => map(() => value)

export const filter = f => source => sink => {
  let callback = source((type, payload) => {
    if (type === NEXT) {
      if (f(payload)) {
        sink(NEXT, payload)
      } else {
        callback(NEXT)
      }
    } else {
      sink(type, payload)
    }
  })
  return callback
}

export const skip = (count = 0) =>
  filter(() => {
    if (count === 0) return true
    count -= 1
    return false
  })

export const take = max => source => sink => {
  let count = 0
  let callback = source((type, payload) => {
    if (type === NEXT) {
      if (count < max) {
        count += 1
        sink(NEXT, payload)
      }
      if (count === max) {
        callback(FINISH)
      }
    } else {
      sink(type, payload)
    }
  })
  return callback
}

export const scan = (f, seed) => source => sink => {
  let acc = seed
  return source((type, payload) => {
    if (type === NEXT) {
      sink(NEXT, (acc = f(acc, payload)))
    } else {
      sink(type, payload)
    }
  })
}

export const concatWith = source2 => source1 => concat(source1, source2)

export const takeLast = (count = 1) => source => sink => {
  let list = []
  let collect = (type, payload) => {
    list.push(payload)
    if (list.length > count) list.shift()
  }
  return (
    source
    |> forkIf(collect, NEXT)
    |> concatWith(once |> switchMap(() => fromArray(list)) |> fork(sink))
    |> toCallback
  )

  // return (
  //   concat(
  //     source |> forkIf(collect, NEXT),
  //     once |> switchMap(() => fromArray(list)) |> fork(sink)
  //   ) |> toCallback
  // )
}

// export const takeLast = (count = 1) => source => sink => {
//   let TAKE_LAST = {}
//   let finished = false
//   let list = []
//   let collect = (type, payload) => {
//     list.push(payload)
//     if (list.length > count) {
//       list.shift()
//     }
//   }
//   let feed = () => {
//     if (finished) return
//     innerCallback =
//       fromArray(list)
//       |> forkAndSwitchIf(outerCallback, NEXT, TAKE_LAST)
//       |> forkIf(outerCallback, FINISH)
//       |> toCallback
//     innerCallback(START)
//   }
//   let innerCallback =
//     source |> forkIf(collect, NEXT) |> forkIf(feed, FINISH) |> toCallback
//   let outerCallback =
//     fromAction(TAKE_LAST)
//     |> forkIf(() => (finished = true), FINISH)
//     |> forkIfNot((type, payload) => innerCallback(type, payload), NEXT)
//     |> fork(sink)
//     |> toCallback
//   return outerCallback
// }

export const then = makeSource => source => sink => {
  return (
    source
    |> forkIfNot(sink, FINISH)
    |> takeLast()
    |> switchMap(makeSource)
    |> fork(sink)
    |> toCallback
  )
}

export const merge = (...sourceList) => sink => {
  let callbackList
  let finishCount = 0
  let finish = () => ++finishCount === sourceList.length && callback(FINISH)
  let callback = guard((type, payload) => {
    if (type === START) {
      callbackList = sourceList.map(
        source =>
          source |> forkIf(sink, NEXT) |> forkIf(finish, FINISH) |> start
      )
      sink(START)
    } else if (type === NEXT) {
      return
    } else if (type === FINISH) {
      callbackList.forEach(callback => callback(FINISH))
      sink(FINISH)
    } else {
      callbackList && callbackList.forEach(callback => callback(type, payload))
      sink(type, payload)
    }
  })
  return callback
}

const EMPTY = {}
export const combine = (...sourceList) => sink => {
  let finishCount = 0
  let finish = () => ++finishCount === sourceList.length && callback(FINISH)
  let valueList = []
  let next = (payload, index) => {
    valueList[index] = payload
    if (valueList.indexOf(EMPTY) === -1) {
      sink(NEXT, valueList.concat())
    }
  }
  let callbackList = sourceList.map((source, index) => {
    valueList[index] = EMPTY
    return (
      source
      |> forkIf((_, payload) => next(payload, index), NEXT)
      |> forkIf(finish, FINISH)
      |> toCallback
    )
  })
  let callback = guard((type, payload) => {
    if (type === START) {
      callbackList.forEach(callback => callback(START))
      sink(START)
    } else if (type === NEXT) {
      return
    } else if (type === FINISH) {
      callbackList.forEach(callback => callback(FINISH))
      sink(FINISH)
    } else {
      callbackList.forEach(callback => callback(type, payload))
      sink(type, payload)
    }
  })
  return callback
}

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

const handle = f => source => sink => {
  let callback = source((type, payload) => {
    f(type, payload, sink, callback)
  })
  return callback
}

export const concat = (...sourceList) => sink => {
  let index = 0
  let loopCallback = null
  let isStarted = false
  let loop = () => {
    if (index === sourceList.length) {
      if (index === 0) sink(START)
      callback(FINISH)
      return
    }
    loopCallback = sourceList[index++]((type, payload) => {
      if (type === START) {
        if (!isStarted) {
          isStarted = true
          sink(START)
        } else {
          loopCallback(NEXT)
        }
      } else if (type === NEXT) {
        sink(NEXT, payload)
      } else if (type === FINISH) {
        loop()
      } else {
        sink(type, payload)
      }
    })
    loopCallback(START)
  }
  let callback = guard((type, payload) => {
    if (type === START) {
      loop()
    } else if (type === FINISH) {
      loopCallback && loopCallback(FINISH)
      sink(FINISH)
    } else {
      loopCallback && loopCallback(type, payload)
    }
  })
  return callback
}

export const share = source => {
  let list = []
  let isStarted = false
  let isFinished = false
  let start = () => {
    isStarted = true
    let sinkList = list.concat()
    for (let i = 0; i < sinkList.length; i++) {
      sinkList[i](START)
    }
  }
  let next = (_, payload) => {
    let sinkList = list.concat()
    for (let i = 0; i < sinkList.length; i++) {
      sinkList[i](NEXT, payload)
    }
  }
  let finish = () => {
    let sinkList = list.concat()
    for (let i = 0; i < sinkList.length; i++) {
      sinkList[i](FINISH)
    }
  }
  let realCallback =
    source
    |> forkIf(start, START)
    |> forkIf(next, NEXT)
    |> forkIf(finish, FINISH)
    |> toCallback
  return sink => {
    let callback = guard((type, payload) => {
      if (type === START) {
        if (!isStarted) {
          realCallback(START)
        } else {
          sink(START)
        }
      } else if (type === NEXT) {
        if (isFinished) {
          sink(FINISH)
        } else {
          return
        }
      } else if (type === FINISH) {
        let index = list.indexOf(sink)
        if (index !== -1) {
          list.splice(index, 1)
        }
        sink(FINISH)
        if (list.length === 0) {
          realCallback(FINISH)
        }
      } else {
        realCallback(type, payload)
      }
    })
    list.push(sink)
    return callback
  }
}

export const takeUntil = until$ => source => sink => {
  let innerCallback = null
  let callback = source((type, payload) => {
    if (type === START) {
      innerCallback =
        until$ |> forkIf(() => callback(FINISH), NEXT) |> toCallback
      innerCallback(START)
      sink(START)
    } else if (type === FINISH) {
      innerCallback(FINISH)
      sink(FINISH)
    } else {
      if (type !== NEXT) {
        innerCallback && innerCallback(type, payload)
      }
      sink(type, payload)
    }
  })
  return callback
}

export const switchMap = makeSource => source => sink => {
  let innerCallback = null
  let outerFinished = false
  let innerFinished = false
  let finish = () => {
    innerCallback = null
    innerFinished = true
    if (outerFinished) {
      callback(FINISH)
    } else {
      outerCallback(NEXT)
    }
  }
  let outerCallback = source((type, payload) => {
    if (type === NEXT) {
      innerCallback && innerCallback(FINISH)
      innerCallback =
        makeSource(payload)
        |> forkIf(sink, NEXT)
        |> forkIf(finish, FINISH)
        |> toCallback
      innerFinished = false
      innerCallback(START)
    } else if (type === FINISH) {
      outerFinished = true
      if (innerFinished) {
        callback(FINISH)
      }
    } else {
      innerCallback && innerCallback(type, payload)
      sink(type, payload)
    }
  })
  let callback = guard((type, payload) => {
    if (type === NEXT) {
      if (innerCallback) {
        innerCallback(NEXT)
      } else {
        outerCallback(NEXT)
      }
    } else if (type === FINISH) {
      innerCallback && innerCallback(FINISH)
      outerCallback(FINISH)
      sink(FINISH)
    } else {
      outerCallback(type, payload)
    }
  })
  return callback
}

export const startWith = startValue => source => sink => {
  let sent = false
  let callback = source(sink)
  return guard((type, payload) => {
    if (type === NEXT) {
      if (!sent) {
        sent = true
        sink(NEXT, startValue)
      } else {
        callback(type, payload)
      }
    } else {
      callback(type, payload)
    }
  })
}
