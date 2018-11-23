export const pipe = (...args) => args.reduce((result, f) => f(result))
export const noop = () => {}
export const identity = x => x
export const constant = value => () => value

export const isObject = obj =>
  Object.prototype.toString.call(obj) === '[object Object]'
export const isSource = obj => !!(obj && typeof obj.make === 'function')

const defaultSink = {
  start: noop,
  next: noop,
  finish: noop,
  error: noop
}
export const makeSink = (sink = {}) => {
  return mapValue(defaultSink, (fn, key) => sink[key] || fn)
}

const defaultHandler = {
  start: noop,
  next: noop,
  finish: noop,
  error: noop
}

export const makeHandler = (handler = {}) => {
  return mapValue(defaultHandler, (fn, key) => handler[key] || fn)
}

export const mapValue = (obj, f) =>
  Object.keys(obj).reduce((result, key) => {
    result[key] = f(obj[key], key)
    return result
  }, {})

export const log = name => source => sink =>
  source({
    start: () => {
      console.log(name, 'start')
      sink.start()
    },
    next: value => {
      console.log(name, 'next', value)
      sink.next(value)
    },
    finish: () => {
      console.log(name, 'finish')
      sink.finish()
    },
    error: error => {
      console.log(name, 'error', error)
      sink.error(error)
    }
  })

export const logValue = name => source => sink =>
  source({
    ...sink,
    next: value => {
      console.log(name, value)
      sink.next(value)
    }
  })

export const logAll = name => source => sink => {
  let action = source({
    start: () => {
      console.log(name, 'sink:start')
      sink.start()
    },
    next: value => {
      console.log(name, 'sink:next', value)
      sink.next(value)
    },
    finish: () => {
      console.log(name, 'sink:finish')
      sink.finish()
    },
    error: error => {
      console.log(name, 'sink:error', error)
      sink.error(error)
    }
  })
  return {
    start: () => {
      console.log(name, 'action:start')
      action.start()
    },
    finish: () => {
      console.log(name, 'action:finish')
      action.finish()
    }
  }
}
