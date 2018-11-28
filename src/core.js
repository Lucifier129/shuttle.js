const { PRE_EXECUTE, POST_EXECUTE } = require('./actions')
const {
  isThenable,
  makeRefList,
  makeStateList,
  makeEffectList
} = require('./util')

let env = null
const getEnv = () => env

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
  return { ...source, resume }
}

const referencable = producer => {
  let refList = makeRefList()
  let source = resumable(props => {
    env = { ...env, refList }
    try {
      refList.reset()
      return producer(props)
    } finally {
      refList.reset()
    }
  })
  return { ...source, refList }
}

const statable = producer => {
  let stateList = makeStateList()
  let source = referencable(props => {
    env = { ...env, stateList }
    try {
      stateList.reset()
      return producer(props)
    } finally {
      stateList.reset()
    }
  })
  return { ...source, stateList }
}

const effectable = producer => {
  let effectList = makeEffectList()
  let source = statable(props => {
    env = { ...env, effectList }
    try {
      effectList.reset()
      return producer(props)
    } finally {
      effectList.reset()
    }
  })
  return { ...source, effectList }
}

const dispatchable = producer => {
  let dispatch = (action, payload) => {
    let { effectList } = source
    effectList.each(effect => effect.perform(action, payload))
  }
  let clean = () => {
    let { effectList } = source
    effectList.each(effect => effect.clean())
  }
  let source = effectable(props => {
    env = { ...env, dispatch }
    return producer(props)
  })
  return {
    ...source,
    dispatch,
    clean
  }
}

const noop = () => {}
const PENDING = {}
const subscribable = producer => {
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
      finish()
    }
  }
  let dispatch = (action, payload) => {
    if (onEffect) {
      let effect = { action, payload }
      try {
        onEffect(effect, source.resume)
      } catch (error) {
        if (error === effect) {
          source.dispatch(action, payload)
        } else {
          throw error
        }
      }
    } else {
      source.dispatch(action, payload)
    }
  }
  let source = dispatchable(props => {
    env = { ...env, dispatch, unsubscribe }
    let result
    try {
      result = producer(props)
    } catch (effect) {
      if (!onEffect) {
        throw effect
      }
      if (effect instanceof Error) {
        
      }
      onEffect(effect, source.resume)
      return PENDING
    }
    if (onNext) {
      onNext(result)
    }
    return result
  })
  return { ...source, dispatch, subscribe, unsubscribe }
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
    let result = producer(props)
    env.dispatch(POST_EXECUTE)
    return result
  })
  return { ...source, producer }
}

module.exports = {
  PENDING,
  getEnv,
  usable
}
