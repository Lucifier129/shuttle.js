const noop = () => {}
const identity = x => x

const guard = actions => {
  let started = false
  let finished = false
  let start = () => {
    if (started || finished) return
    started = true
    actions.start()
  }
  let next = value => {
    if (!started) throw new Error('call [next] before [start]')
    if (finished) return
    sink.next(value)
  }
  let finish = () => {
    if (finished) return
    finished = true
    if (!started) return
    sink.finish()
  }
  let dispatch = (type, payload) => {
    if (!started) throw new Error('call [dispatch] before [start]')
    if (finished) return
    actions.dispatch(type, payload)
  }
  return {
    ...actions,
    start,
    next,
    finish,
    dispatch,
    original: actions
  }
}

const pullable = sink => source => {
  let start = () => {
    sink.start && sink.start()
    actions.next()
  }
  let next = value => {
    sink.next && sink.next(value)
    actions.next()
  }
  let finish = () => {
    sink.finish && sink.finish()
  }
  let dispatch = (type, payload) => {
    sink.dispatch && sink.dispatch(type, payload)
  }
  let actions = source({
    ...sink,
    start,
    next,
    finish,
    dispatch
  })
  return actions
}

const run = sink => source => {
  let actions = pullable(sink)(source)
  actions.start()
  return actions
}

const interval = (period = 1000) => sink => {
  let i = 0
  let timer = null
  let start = () => {
    timer = setInterval(() => sink.next(i++), period)
    sink.start()
  }
  let next = noop
  let finish = () => {
    clearInterval(timer)
    sink.finish()
  }
  return guard({ ...sink, start, next, finish })
}

const empty = sink => {
  return guard({
    ...sink,
    next: sink.finish
  })
}

const fromAction = actionType => sink => {
  let dispatch = (type, payload) => {
    if (type === actionType) {
      sink.next(payload)
    } else {
      sink.dispatch(type, payload)
    }
  }
  return guard({
    ...sink,
    dispatch
  })
}

const map = f => source => sink => {
  return source({
    ...sink,
    next: value => sink.next(f(value))
  })
}

const filter = f => source => sink => {
  let next = value => {
    if (f(value)) {
      sink.next(value)
    } else {
      actions.next()
    }
  }
  let actions = source({
    ...sink,
    next
  })
  return actions
}

const take = (max = 0) => source => sink => {
  let actions = source(sink)
  let count = 0
  let next = () => {
    if (count === max) return actions.finish()
    count += 1
    actions.next()
  }
  return {
    ...actions,
    next
  }
}

const scan = (f, seed) => source => sink => {
  let acc = seed
  let next = value => sink.next((acc = f(acc, value)))
  return source({
    ...sink,
    next
  })
}

const skip = (count = 0) => {
  return filter(() => {
    if (count === 0) return true
    count -= 1
    return false
  })
}

const takeUntil = until$ => source => sink => {
  let actions = source(sink)
  let start = () => {
    actions.start()
    untilActions.start()
  }
  let next = () => {
    actions.finish()
    untilActions.finish()
  }
  let dispatch = (type, payload) => {
    actions.dispatch(type, payload)
    untilActions.dispatch(type, payload)
  }
  let untilActions = pullable({ next })(until$)
  return {
    ...actions,
    start,
    dispatch
  }
}

const consume = make => source => sink => {
  let innerActions = null
  let innerSink = {
    next: sink.next,
    finish: () => {
      innerActions = null
      outerActions && doMake()
    }
  }
  let doMake = () => {
    let makedSource = make()
    if (!makedSource) return outerActions && outerActions.finish()
    innerActions = pullable(innerSink)(makedSource)
    innerActions.start()
  }
  let outerSink = {
    ...sink,
    start: () => {
      sink.start()
      doMake()
    },
    next: noop,
    finish: () => {
      outerActions = null
      innerActions && innerActions.finish()
      sink.finish()
    }
  }
  let outerActions = source(outerSink)
  let dispatch = (type, payload) => {
    innerActions && innerActions.dispatch(type, payload)
    outerActions && outerActions.dispatch(type, payload)
  }
  return {
    ...outerActions,
    dispatch
  }
}

const consumeOnce = make => {
  let maked = false
  return consume(() => {
    if (maked) return
    maked = true
    return make()
  })
}

const consumeWith = make => source => {
  let readed = false
  return consume(() => {
    if (readed) make()
    readed = true
    return source
  })
}

const consumeOnceWith = make => source => {
  let readed = false
  let consumed = false
  return consume(() => {
    if (!readed) {
      readed = true
      return source
    } else if (!consumed) {
      consumed = true
      return make()
    }
  })
}

const takeLast = (count = 1) => source => sink => {
  let list = []
	let innerSink = {
		next: value => {
			list.push(value)
			if (list.length > count) list.shift()
		},
		finish: () => {
			innerActions = pullable(sink)(fromArray(list))
			innerActions.start()
		}
	}
	let outerActions = pullable(innerSink)(source)
	return {
		...outerActions,
		finish: () => {
			innerActions && innerActions.finish()
			outerActions.finish()
		}
	}
}

const switchMap = (makeSource, f = identity) => source => sink => {
  let innerActions = null
  let innerSink = {
    next: value => sink.next(f(value)),
    finish: () => {
      innerActions = null
      outerActions && outerActions.next()
    }
  }
  let outerSink = {
    ...sink,
    next,
    finish: () => {
      sink.finish()
      outerActions = null
      innerActions && innerActions.finish()
    }
  }
  let next = value => {
    innerActions && innerActions.finish()
    innerActions = pullable(innerSink)(makeSource(value))
    innerActions.start()
  }
  let outerActions = source(outerSink)
  let dispatch = (type, payload) => {
    outerActions && outerActions.dispatch(type, payload)
    innerActions && innerActions.dispatch(type, payload)
  }
  return {
    ...outerActions,
    dispatch
  }
}
