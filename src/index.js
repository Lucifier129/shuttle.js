import { shallowEqual, shallowEqualList } from './util'

let current = null
let stateIndex = 0
let effectIndex = 0
let refIndex = 0

export const useState = initialValue => {
  if (!current) {
    throw new Error(`You can't use useState outside the usable function`)
  }
  return current.getState(stateIndex++, initialValue)
}

export const useRef = initialValue => {
  if (!current) {
    throw new Error(`You can't use useRef outside the usable function`)
  }
  return current.getRef(refIndex++, initialValue)
}

export const useGetSet = initialValue => {
  let [value, setValue] = useState(initialValue)
  let ref = useRef()
  if (!ref.current) {
    ref.current = {
      value: value,
      getValue: () => ref.current.value
    }
  }
  ref.current.value = value
  return [ref.current.getValue, setValue]
}

const PRE_EFFECT = Symbol('pre-effect')
export const useRaise = (handler, argList) => {
  if (!current) {
    throw new Error(`You can't use useRaise outside the usable function`)
  }

  let [value, setValue] = useState()
  let effectHandler = useEffectHandler(PRE_EFFECT, handler, argList)
  let effect = current.setEffect(
    effectIndex++,
    PRE_EFFECT,
    effectHandler.handleEffect
  )

  if (!effectHandler.hasOwnProperty('status')) {
    effectHandler.status = 0
    effectHandler.resume = value => {
      effectHandler.status = 1
      setValue(value)
    }
  }

  if (effectHandler.shouldPerform) {
    let performEffect = current.performEffect
    throw {
      type: PRE_EFFECT,
      handler: () => performEffect(effect, PRE_EFFECT, effectHandler.resume)
    }
  }

  return value
}

export const useSuspense = (handler, argList) => {
  return useRaise(resume => handler().then(resume), argList)
}

const POST_EFFECT = Symbol('post-effect')
export const useEffect = (action, handler, argList) => {
  if (!current) {
    throw new Error(`You can't use useEffect outside the usable function`)
  }

  if (typeof action === 'function') {
    argList = handler
    handler = action
    action = POST_EFFECT
  }

  let effectHandler = useEffectHandler(action, handler, argList)
  current.setEffect(effectIndex++, action, effectHandler.handleEffect)
}

const useEffectHandler = (action, handler, argList) => {
  let ref = useRef()

  if (!ref.current) {
    ref.current = createEffectRef(action, handler, argList)
    return ref.current
  }

  if (!ref.current.shouldPerform) {
    ref.current.shouldPerform =
      ref.current.action !== action ||
      !shallowEqualList(ref.current.argList, argList)
  }

  if (ref.current.shouldPerform) {
    ref.current.handler = handler
  }

  ref.current.argList = argList
  ref.current.action = action

  return ref.current
}

const createEffectRef = (action, handler, argList) => {
  let current = {
    action,
    handler,
    argList,
    clean: null,
    shouldPerform: true,
    handleEffect: (payload, action) => {
      if (!current.shouldPerform) return
      current.shouldPerform = false
      current.clean = current.handler(payload, action)
      return current.handleClean
    },
    handleClean: isDestroy => {
      if (!current.shouldPerform) return
      let clean = current.clean
      current.clean = null
      if (typeof clean === 'function') clean(isDestroy)
    }
  }
  return current
}

export const usable = producer => {
  let stateList = []
  let updateState = index => nextValue => {
    stateList[index][0] = nextValue
    produce()
  }
  let getState = (index, initialValue) => {
    if (!stateList[index]) {
      stateList[index] = [initialValue, updateState(index)]
    }
    return stateList[index]
  }

  let refList = []
  let getRef = (index, initialValue) => {
    if (!refList[index]) {
      refList[index] = { current: initialValue }
    }
    return refList[index]
  }

  let effectList = []
  let setEffect = (index, action, handler) => {
    let effect = effectList[index]
    if (!effect) {
      effectList[index] = {
        action,
        handler,
        clean: null
      }
      return effectList[index]
    }
    effect.action = action
    effect.handler = handler
    return effect
  }
  let performEffect = (effect, action, payload) => {
    if (effect.action === action) {
      cleanEffect(effect)
      effect.clean = effect.handler(payload, action)
    }
  }
  let performEffectList = (action, payload) => {
    for (let i = 0; i < effectList.length; i++) {
      performEffect(effectList[i], action, payload)
    }
  }
  let cleanEffect = (effect, isDestroy) => {
    let { clean } = effect
    effect.clean = null
    if (typeof clean === 'function') clean(!!isDestroy)
  }
  let cleanEffectList = isDestroy => {
    for (let i = 0; i < effectList.length; i++) {
      cleanEffect(effectList[i], isDestroy)
    }
  }

  let hasPending = false
  let produce = () => {
    if (current === internal) {
      return (hasPending = true)
    }
    let result
    let previous = current
    current = internal
    stateIndex = 0
    effectIndex = 0
    refIndex = 0

    try {
      result = producer()
    } catch (effect) {
      if (!effect || effect.type !== PRE_EFFECT) {
        throw effect
      }
      current = previous
      hasPending = false
      effect.handler()
      return
    }
    current = previous
    if (hasPending) {
      hasPending = false
      produce()
    } else {
      publish(result)
      dispatch(POST_EFFECT)
    }
  }

  let currentAction = null
  let currentPayload = null
  let dispatch = (action, payload) => {
    currentAction = action
    currentPayload = payload
    performEffectList(action, payload)
    currentAction = null
    currentPayload = null
  }

  let listenerList = []
  let subscribe = listener => {
    if (!listenerList.includes(listener)) {
      listenerList.push(listener)
    }
    return () => {
      let index = listenerList.indexOf(listener)
      if (index !== -1) listenerList.splice(index, 1)
    }
  }
  let publish = result => {
    for (let i = 0; i < listenerList.length; i++) {
      listenerList[i](result, currentAction, currentPayload)
    }
  }

  let isInited = false
  let init = () => {
    if (isInited) return
    isInited = true
    produce()
  }

  let isDestroyed = false
  let destroy = () => {
    isDestroyed = true
    listenerList.length = 0
    refList.length = 0
    cleanEffectList(true)
    cleanList.length = 0
    stateList.length = 0
  }

  let internal = {
    getState,
    setEffect,
    performEffect,
    getRef
  }

  let protect = obj => {
    return Object.keys(obj).reduce((result, key) => {
      result[key] = (...args) => {
        if (isDestroyed) return
        return obj[key](...args)
      }
      return result
    }, {})
  }

  return protect({
    init,
    destroy,
    dispatch,
    subscribe
  })
}
