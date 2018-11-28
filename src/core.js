const { shallowEqualList, isThenable, makeList, makeDict } = require('./util')
const { PRE_EXECUTE, POST_EXECUTE } = require('./actions')

let env = null
const getEnv = () => env

const makeRefList = () => {
  let refList = makeList()
  let get = initialValue => {
    if (!refList.exist()) {
      refList.set({ current: initialValue })
    }
    return refList.get()
  }
  return { ...refList, get }
}

const makeStateList = () => {
  let stateList = makeList()
  let get = initialState => {
    if (!stateList.exist()) {
      let pair = [initialState, value => (pair[0] = value)]
      stateList.set(pair)
    }
    return stateList.get()
  }

  return { ...stateList, get }
}

const makeEffect = (action, handler, argList) => {
  let performed = false
  let cleanUp = null
  let clean = () => {
    if (cleanUp) {
      let fn = cleanUp
      cleanUp = null
      fn()
    }
  }
  let perform = (action, payload) => {
    if (effect.action !== action || performed) {
      return
    }
    clean()
    performed = true
    let result = effect.handler.call(null, payload, action)
    if (typeof result === 'function') {
      cleanUp = result
    }
  }
  let update = (action, handler, argList) => {
    let isEqualAction = effect.action === action
    let isEqualArgList = shallowEqualList(effect.argList, argList)

    if (!isEqualAction || !isEqualArgList) {
      effect.handler = handler
      performed = false
    }

    effect.action = action
    effect.argList = argList
  }
  let effect = {
    action,
    handler,
    argList,
    clean,
    perform,
    update
  }
  return effect
}

const makeEffectList = () => {
  let effectList = makeList()
  let get = (action, handler, argList) => {
    if (!effectList.exist()) {
      effectList.set(makeEffect(action, handler, argList))
    }
    let effect = effectList.get()
    effect.update(action, handler, argList)
    return effect
  }

  return { ...effectList, get }
}

const runnable = producer => {
  let runing = false
  let rerun = false
  let run = props => {
    if (runing) {
      rerun = true
      return
    }

    let result
    try {
      env = { props }
      runing = true
      result = producer(props)
    } finally {
      runing = false
    }

    if (rerun) {
      rerun = false
      return run(props)
    }
    return result
  }
  return { run }
}

const resumable = producer => {
  let currentProps = null
  let resume = () => source.run(currentProps)
  let source = runnable(props => {
    try {
      env = { ...env, resume }
      currentProps = env.props
      return producer(props)
    } finally {
      env = null
    }
  })
  return source
}

const referencable = producer => {
  let refList = makeRefList()
  return resumable(props => {
    env = { ...env, refList }
    try {
      refList.reset()
      return producer(props)
    } finally {
      refList.reset()
    }
  })
}

const statable = producer => {
  let stateList = makeStateList()
  return referencable(props => {
    env = { ...env, stateList }
    try {
      stateList.reset()
      return producer(props)
    } finally {
      stateList.reset()
    }
  })
}

const effectable = producer => {
  let effectList = makeEffectList()
  return statable(props => {
    env = { ...env, effectList }
    try {
      effectList.reset()
      return producer(props)
    } finally {
      effectList.reset()
    }
  })
}

const dispatchable = producer => {
  let effectList = null
  let dispatch = (action, payload) => {
    if (!effectList) {
      throw new Error('effect list is empty')
    }
    effectList.each(effect => effect.perform(action, payload))
  }
  let source = effectable(props => {
    env = { ...env, dispatch }
    effectList = env.effectList
    return producer(props)
  })
  let clean = () => {
    effectList.each(effect => effect.clean())
  }

  return {
    ...source,
    clean,
    dispatch
  }
}

const noop = () => {}
const subscribable = producer => {
  let lastResult
  let onNext = null
  let onFinish = null
  let onEffect = null
  let subscribe = (handleNext = noop, handleFinish = noop, handleEffect) => {
    if (onNext) {
      throw new Error('can not subscribe twice')
    }

    if (typeof handleNext !== 'function') {
      let message = `first argument of subscribe must be a function instead of ${handleNext}`
      throw new Error(message)
    }

    if (typeof handleFinish !== 'function') {
      let message = `second argument of subscribe must be a function instead of ${handleFinish}`
      throw new Error(message)
    }

    if (handleEffect != null && typeof handleEffect !== 'function') {
      let message = `third argument of subscribe must be a function instead of ${handleEffect}`
      throw new Error(message)
    }

    onNext = handleNext
    onFinish = handleFinish
    onEffect = handleEffect
  }
  let unsubscribe = () => {
    let finish = onFinish
    onNext = null
    onFinish = null
    onEffect = null
    source.clean()
    if (finish) {
      finish(lastResult)
    }
  }
  let source = dispatchable(props => {
    env = { ...env, unsubscribe }
    try {
      lastResult = producer(props)
    } catch (effect) {
      if (!onEffect) {
        throw effect
      }
      onEffect(effect, env.resume)
      return lastResult
    }
    if (onNext) {
      onNext(lastResult)
    }
    return lastResult
  })
  return { ...source, subscribe, unsubscribe }
}

const suspensible = producer => {
  let source = subscribable(producer)
  let subscribe = (handleNext, handleFinish, handleEffect) => {
    return source.subscribe(handleNext, handleFinish, (effect, resume) => {
      if (isThenable(effect)) {
        effect.then(() => resume())
        return
      }
      if (typeof handleEffect === 'function') {
        handleEffect(effect, resume)
        return
      }
      throw effect
    })
  }
  return { ...source, subscribe }
}

const interruptible = producer => {
  let source = suspensible(producer)
  let subscribe = (handleNext, handleFinish, handleEffect) => {
    return source.subscribe(handleNext, handleFinish, (effect, resume) => {
      if (effect === PRE_EXECUTE) {
        return // just ignore it, effect had done in producer
      }
      if (typeof handleEffect === 'function') {
        handleEffect(effect, resume)
        return
      }
      throw effect
    })
  }
  return { ...source, subscribe }
}

const usable = producer => {
  let source = interruptible(props => {
    let source = producer(props)
    env.dispatch(POST_EXECUTE)
    return source
  })
  return { ...source, producer }
}

module.exports = {
  getEnv,
  usable
}
