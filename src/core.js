const { shallowEqualList, isThenable, makeList, makeDict } = require('./util')

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
  let resume = () => result.run(currentProps)
  let result = runnable(props => {
    try {
      env = { ...env, resume }
      currentProps = env.props
      return producer(props)
    } finally {
      env = null
    }
  })
  return result
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
  let result = effectable(props => {
    env = { ...env, dispatch }
    effectList = env.effectList
    return producer(props)
  })
  let clean = () => {
    effectList.each(effect => effect.clean())
  }

  return {
    ...result,
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
    result.clean()
    if (finish) {
      finish(lastResult)
    }
  }
  let result = dispatchable(props => {
    env = { ...env, unsubscribe }
    try {
      lastResult = producer(props)
    } catch (effect) {
      if (!onEffect) {
        throw effect
      }
      onEffect(effect, env.resume)
      return
    }
    if (onNext) {
      onNext(lastResult)
    }
    return lastResult
  })
  return { ...result, subscribe, unsubscribe }
}

const suspensible = producer => {
  let result = subscribable(producer)
  let subscribe = (handleNext, handleFinish, handleEffect) => {
    return result.subscribe(handleNext, handleFinish, (effect, resume) => {
      if (isThenable(effect)) {
        effect.then(() => resume)
        return
      }
      if (typeof handleEffect === 'function') {
        handleEffect(effect, resume)
        return
      }
      throw effect
    })
  }
  return { ...result, subscribe }
}

const PRE_EFFECT = Symbol.for('@sukkula/pre-effect')
const interruptible = producer => {
  let result = suspensible(producer)
  let subscribe = (handleNext, handleFinish, handleEffect) => {
    return result.subscribe(handleNext, handleFinish, (effect, resume) => {
      if (effect === PRE_EFFECT) {
        return // just ignore it, effect had done in producer
      }
      if (typeof handleEffect === 'function') {
        handleEffect(effect, resume)
        return
      }
      throw effect
    })
  }
  return { ...result, subscribe }
}

const POST_EFFECT = Symbol.for('@sukkula/post-effect')
const usable = producer => {
  let result = interruptible(props => {
    let result = producer(props)
    env.dispatch(POST_EFFECT)
    return result
  })
  return { ...result, producer }
}

const actions = {
  POST_EFFECT
}

module.exports = {
  getEnv,
  usable,
  actions
}
