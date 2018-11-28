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

const isThenable = obj => !!(obj && typeof obj.then === 'function')

module.exports = {
  isThenable,
  shallowEqual,
  shallowEqualList,
  makeList,
  makeDict
}
