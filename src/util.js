export function shallowEqual(objA, objB) {
  if (objA === objB) {
    return true
  }

  if (
    typeof objA !== "object" ||
    objA === null ||
    typeof objB !== "object" ||
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

export function shallowEqualList(listA, listB) {
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
