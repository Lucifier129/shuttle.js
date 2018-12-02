const { NEXT, ERROR, CATCH, SUSPENSE, EFFECT } = require('./constant')
const {
  noop,
  pipe,
  deferred,
  isThenable,
  makeRefList,
  makeStateList,
  makeEffectList
} = require('./util')

let env = null
let getEnv = () => env

const resumable = producer => {
  let runing = false
  let rerun = false
  let currentArg
  let resume = (arg = currentArg) => {
    currentArg = arg
    if (runing) {
      rerun = true
      return
    }

    let result
    try {
      env = { ...env, resume }
      runing = true
      result = producer(arg)
    } finally {
      runing = false
    }

    if (rerun) {
      rerun = false
      return resume()
    }
    return result
  }
  return resume
}

const referencable = producer => {
  let refList = makeRefList()
  let withRef = arg => {
    env = { ...env, refList }
    try {
      refList.reset()
      return producer(arg)
    } finally {
      refList.reset()
    }
  }
  return withRef
}

const statable = producer => {
  let stateList = makeStateList()
  let withState = arg => {
    env = { ...env, stateList }
    try {
      stateList.reset()
      return producer(arg)
    } finally {
      stateList.reset()
    }
  }
  return withState
}

const effectable = producer => {
  let effectList = makeEffectList()
  let perform = (action, payload) => {
    if (env) {
      throw new Error(`You can't perform effect in usable function directly`)
    }
    let performed = false
    effectList.each(effect => {
      if (effect.perform(action, payload)) {
        performed = true
      }
    })
    return performed
  }
  let clean = () => {
    if (env) {
      throw new Error(`You can't cleanup in usable function directly`)
    }
    effectList.each(effect => effect.clean())
    effectList.destory()
  }
  let withEffect = arg => {
    env = { ...env, effectList, perform, clean }
    try {
      effectList.reset()
      return producer(arg)
    } finally {
      effectList.reset()
    }
  }
  return withEffect
}

const hookable = pipe(
  referencable,
  statable,
  effectable,
  resumable
)

const defaultObserver = {
  next: noop,
  error: null,
  catch: null,
  complete: noop,
  effect: noop
}

const observable = observer => producer => {
  observer = { ...defaultObserver, ...observer }
  let hasErrorHandler = typeof observer.error === 'function'
  let hasCatchableHandler = typeof observer.catch === 'function'
  let isCompleted = false
  let lastEnv
  let lastResult
  let checkStatus = () => {
    if (!lastEnv) {
      throw new Error(
        `The source is not start, should call trigger.next method first`
      )
    }
    if (isCompleted) {
      throw new Error('The source is completed, should not trigger anymore')
    }
  }
  let produce = arg => {
    if (isCompleted) return
    lastEnv = env
    env = { ...env, trigger }
    try {
      lastResult = producer(arg)
    } catch (catchable) {
      env = null
      handleCatchable(catchable)
      return
    }
    env = null
    handleNext(lastResult)
  }
  let handleNext = value => {
    observer.next(value)
    if (!isCompleted) {
      handleEffect(NEXT, value)
    }
  }
  let handleError = error => {
    checkStatus()
    if (error instanceof Error) {
      if (hasErrorHandler) {
        observer.error(error)
      }
      let performed = handleEffect(ERROR, error)
      if (!performed && !hasErrorHandler) {
        throw error
      }
      return true
    }
    return false
  }
  let handlePromise = promise => {
    checkStatus()
    if (isThenable(promise)) {
      promise.then(() => env.resume())
      handleEffect(SUSPENSE, promise)
      return true
    }
    return false
  }
  let handleCatchable = catchable => {
    checkStatus()
    if (handleError(catchable) || handlePromise(catchable)) {
      return true
    }
    if (hasCatchableHandler) {
      observer.catch(catchable, lastEnv.resume)
    }
    let performed = handleEffect(CATCH, catchable)
    if (!performed && !hasCatchableHandler) {
      throw catchable
    }
    return true
  }
  let handleComplete = () => {
    if (isCompleted) return
    isCompleted = true
    let env = lastEnv
    lastEnv = null
    if (env) {
      env.clean()
    }
    observer.complete(lastResult)
  }
  let handleEffect = (action, payload) => {
    checkStatus()
    observer.effect(action, payload)
    lastEnv.perform(action, payload)
  }
  let trigger = {
    next: hookable(produce),
    complete: handleComplete,
    error: handleError,
    effect: handleEffect,
    catch: handleCatchable
  }
  return trigger
}

const usable = producer => {
  let use = observer => observable(observer)(producer)
  return { use }
}

module.exports = {
  getEnv,
  usable
}
