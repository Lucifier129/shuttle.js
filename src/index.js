const { usable, getEnv } = require('./core')
const { NEXT, ERROR, COMPLETE, CATCH, EFFECT } = require('./constant')

const usePerform = () => {
  let env = getEnv()
  if (!env) {
    throw new Error(`You can't use usePerform outside the usable function`)
  }
  return env.trigger.effect
}

const useComplete = () => {
  let env = getEnv()
  if (!env) {
    throw new Error(`You can't use useComplete outside the usable function`)
  }
  return env.trigger.complete
}

const useResume = () => {
  let env = getEnv()
  if (!env) {
    throw new Error(`You can't use useResume outside the usable function`)
  }
  return env.resume
}

const useRef = initialValue => {
  let env = getEnv()
  if (!env) {
    throw new Error(`You can't use useRef outside the usable function`)
  }
  return env.refList.get(initialValue)
}

const useState = initialState => {
  let env = getEnv()
  if (!env) {
    throw new Error(`You can't use useState outside the usable function`)
  }
  let { stateList } = env
  let isExisted = stateList.exist()
  let resume = useResume()
  let state = stateList.get(initialState)

  if (!isExisted) {
    let setState = state[1]
    state[1] = value => {
      setState(value)
      resume()
    }
  }

  return state
}

const useGetSet = initialState => {
  let env = getEnv()
  if (!env) {
    throw new Error(`You can't use useGetSet outside the usable function`)
  }
  let { stateList } = env
  let isExisted = stateList.exist()
  let state = useState(initialState)

  if (!isExisted) {
    let [currentValue, setValue] = state
    let get = () => currentValue
    let set = value => {
      currentValue = value
      setValue(get)
    }
    state[0] = get
    state[1] = set
  }

  return state
}

const useEffect = (action, handler, argList) => {
  let env = getEnv()
  if (!env) {
    throw new Error(`You can't use useEffect outside the usable function`)
  }
  if (typeof action === 'function') {
    argList = handler
    handler = action
    action = EFFECT
  }
  env.effectList.get(action, handler, argList)
}

const useOnNext = (handler, argList) => {
  useEffect(NEXT, handler, argList)
}

const useOnError = (handler, argList) => {
  useEffect(ERROR, handler, argList)
}

const useOnComplete = (handler, argList) => {
  useEffect(COMPLETE, handler, argList)
}

const useOnCatch = (handler, argList) => {
  useEffect(CATCH, handler, argList)
}

module.exports = {
  usable,
  usePerform,
  useComplete,
  useEffect,
  useOnNext,
  useOnError,
  useOnComplete,
  useOnCatch,
  useState,
  useRef,
  useGetSet
}
