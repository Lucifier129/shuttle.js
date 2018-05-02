import { START, NEXT, FINISH, ERROR } from './constant'

export const pipe = (...args) => args.reduce((result, f) => f(result))

export const guard = callback => {
	let isStarted = false
	let isFinished = false
	let guarder = (type, payload) => {
		if (isFinished) return
		if (isStarted && type === START) return
		if (type === START) isStarted = true
		if (type === FINISH) isFinished = true
		if (!isStarted && type === FINISH) return
		if (!isStarted && type !== START) {
			let message = `source should be started before action: ${type}`
			throw new Error(message)
		}
		callback(type, payload)
	}
	guarder.original = callback
	return guarder
}

const action = { START, NEXT, FINISH, ERROR }
const getActionName = type => {
	let target = Object.keys(action).find(name => action[name] === type)
	return target != null ? target : type
}
export const log = name => source => sink => {
	let callback = source((type, payload) => {
		console.log('[forward]', name, getActionName(type), payload)
		return sink(type, payload)
	})
	return guard((type, payload) => {
		console.log('[backward]', name, getActionName(type), payload)
		return callback(type, payload)
	})
}

export const logValue = name => source => sink => {
	return source((type, payload) => {
		if (type === NEXT) {
			console.log('[value]', name, payload)
		}
		return sink(type, payload)
	})
}
