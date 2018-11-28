const { usable, getEnv, PENDING } = require('./core')
const { POST_EXECUTE } = require('./actions')

const useProps = () => {
  let env = getEnv()
  if (!env) {
    throw new Error(`You can't use useProps outside the usable function`)
  }
  return env.props
}

const useRef = initialValue => {
  let env = getEnv()
  if (!env) {
    throw new Error(`You can't use useRef outside the usable function`)
  }
  return env.refList.get(initialValue)
}

const useResume = () => {
  let env = getEnv()
  if (!env) {
    throw new Error(`You can't use useResume outside the usable function`)
  }
  return env.resume
}

const useDispatch = () => {
  let env = getEnv()
  if (!env) {
    throw new Error(`You can't use useDispatch outside the usable function`)
  }
  return env.dispatch
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
    action = POST_EXECUTE
  }
  env.effectList.get(action, handler, argList)
}

const useUnsubscribe = () => {
  let env = getEnv()
  if (!env) {
    throw new Error(`You can't use useUnsubscribe outside the usable function`)
  }
  return env.unsubscribe
}

const run = (runnable, props) => {
  let result = runnable.run(props)
  if (result === PENDING) {
    return { status: 0 }
  }
  return { status: 1, value: result }
}

const subscribe = (subscribable, onNext, onFinish, onEffect) => {
  if (typeof onNext === 'object') {
    onFinish = onNext.finish
    onEffect = onNext.effect
    onNext = onNext.next
  }
  subscribable.subscribe(onNext, onFinish, onEffect)
}

const unsubscribe = subscribable => {
  if (subscribable) {
    subscribable.unsubscribe()
    return
  }
  let unsubscribe = useUnsubscribe()
  unsubscribe()
}

const dispatch = (dispatchable, action, payload) => {
  dispatchable.dispatch(action, payload)
}

module.exports = {
  run,
  subscribe,
  unsubscribe,
  dispatch,
  usable,

  useState,
  useEffect,
  useRef,
  useResume,
  useDispatch,
  useGetSet,
  useProps,
  useUnsubscribe
}
