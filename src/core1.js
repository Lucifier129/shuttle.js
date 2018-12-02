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

let effectHandler = null

const use = effect => {
  if (!effectHandler) {
    throw new Error(`Can not use \`use\` outside the usable function`)
  }
  return effectHandler(effect)
}

const CALL = Symbol('@call')
const RETURN = Symbol('@return')

const usable = f => {
  let use = user => {
    let isRunning = false
    let shouldResume = false
    let currentArgs = []
    let resume = () => handleNext(...currentArgs)
    let handleNext = (...args) => {
      currentArgs = args
      if (isRunning) {
        shouldResume = true
        return
      }
      let result
      try {
        effectHandler = handleEffect
        isRunning = true
        result = f(...args)
      } catch (effect) {
        handleEffect(effect)
        return
      } finally {
        effectHandler = null
        isRunning = false
      }
      if (shouldResume) {
        shouldResume = false
        resume()
        return
      }
      user.next(result)
    }
    let handleEffect = effect => {
      return user.effect(effect, resume)
    }
    return {
      next: handleNext,
      effect: handleEffect
    }
  }
  return { use }
}

let count$ = usable(initialCount => {
  useCatch(error => {

  })
  
  let [count, setCount] = use(state(initialCount))
  let switch$ = useSwitch(interval$, i => of(i))
  let a = use(switch$)
  return { count, setCount }
})

let trigger = count$.use(stateHandler, refHandler, actionHandler, {
  next: ({ count, setCount }) => {
    console.log('count', count)
    setTimeout(() => setCount(count + 1), 1000)
  }
})

withHandlers(stateHandler, refHandler, actionHandler)(count$)

trigger.next({ count: 10 })

const stateHandler = {
  type: Symbol.for('@@state'),
  before: () => {},
  handle: (initialState, resume) => {},
  after: () => {}
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

const withStateEffect = source => {
  let stateList = makeStateList()
  let use = user => {}
  return { use }
}
