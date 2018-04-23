import { START, NEXT, FINISH, ASYNC } from './constant'

export const guard = callback => {
  let isStarted = false
  let isFinished = false
  let guarder = (type, payload) => {
    if (!isStarted && type !== START) {
      let message = `source should be started before action: ${type}`
      throw new Error(message)
    }
    if (isFinished) return
    if (isStarted && type === START) return
    if (type === START) isStarted = true
    if (type === FINISH) isFinished = true
    callback(type, payload)
  }
  guarder.original = callback
  return guarder
}

export const log = name => source => sink => {
  return source((type, payload) => {
    console.log('name', type, payload)
    return sink(type, payload)
  })
}
