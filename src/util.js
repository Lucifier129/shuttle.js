const shallowEqual = (objA, objB) => {
  if (objA === objB) {
    return true
  }

  if (
    typeof objA !== 'object' ||
    objA === null ||
    typeof objB !== 'object' ||
    objB === null
  ) {
    return false
  }

  var keysA = Object.keys(objA)
  var keysB = Object.keys(objB)

  if (keysA.length !== keysB.length) {
    return false
  }

  // Test for A's keys different from B.
  for (var i = 0; i < keysA.length; i++) {
    if (!objB.hasOwnProperty(keysA[i]) || objA[keysA[i]] !== objB[keysA[i]]) {
      return false
    }
  }

  return true
}

const shallowEqualList = (listA, listB) => {
  if (!Array.isArray(listA) || !Array.isArray(listB)) {
    return false
  }

  if (listA.length !== listB.length) {
    return false
  }

  for (let i = 0; i < listA.length; i++) {
    if (!shallowEqual(listA[i], listB[i])) {
      return false
    }
  }

  return true
}

const makeList = (initialList = []) => {
  let list = initialList
  let offset = 0
  let reset = () => (offset = 0)
  let exist = () => list.length > offset
  let get = () => {
    let target = list[offset]
    offset += 1
    return target
  }
  let set = item => (list[offset] = item)
  let getAll = () => list
  let each = f => list.forEach(f)
  return { exist, get, set, reset, each, getAll }
}

const makeDict = (initialDict = {}) => {
  let dict = initialDict
  let exist = key => dict.hasOwnProperty(key)
  let get = key => dict[key]
  let set = (val, key) => (dict[key] = val)
  let getAll = () => dict
  return { exist, get, set, getAll }
}

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

const isThenable = obj => !!(obj && typeof obj.then === 'function')

module.exports = {
  isThenable,
  shallowEqual,
  shallowEqualList,
  makeList,
  makeDict,
  makeRefList,
  makeStateList,
  makeEffectList
}
