const { shallowEqualList } = require('./util')

let env = null

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

const makeEffectList = () => {
	let effectList = makeList()
	let get = (action, handler, argList) => {
		if (!effectList.exist()) {
			let cleanUp = null
			let clean = () => {
				if (cleanUp) {
					let fn = cleanUp
					cleanUp = null
					fn()
				}
			}
			let perform = (action, payload) => {
				if (effect.action !== action || effect.performed) {
					return
				}
				clean()
				effect.performed = true
				let result = effect.handler.call(null, payload, action)
				if (typeof result === 'function') {
					cleanUp = result
				}
			}
			let effect = {
				action,
				handler,
				argList,
				clean,
				perform,
				performed: false
			}
			effectList.set(effect)
		}

		let effect = effectList.get()
		let isEqualAction = effect.action === action
		let isEqualArgList = shallowEqualList(effect.argList, argList)

		if (!isEqualAction || !isEqualArgList) {
			effect.handler = handler
			effect.performed = false
		}

		effect.action = action
		effect.argList = argList

		return effect
	}

	return { ...effectList, get }
}

const runnable = producer => {
	let runing = false
	let rerun = false
	let run = () => {
		if (runing) {
			rerun = true
			return
		}

		let result
		try {
			runing = true
			result = producer()
		} finally {
			runing = false
		}

		if (rerun) {
			rerun = false
			return run()
		}
		return result
	}
	return { run }
}

const resumable = producer => {
	let { run } = runnable(() => {
		try {
			env = { resume: run }
			return producer()
		} finally {
			env = null
		}
	})
	return { run }
}

const referencable = producer => {
	let refList = makeRefList()
	return resumable(() => {
		env = { ...env, refList }
		try {
			refList.reset()
			return producer()
		} finally {
			refList.reset()
		}
	})
}

const statable = producer => {
	let stateList = makeStateList()
	return referencable(() => {
		env = { ...env, stateList }
		try {
			stateList.reset()
			return producer()
		} finally {
			stateList.reset()
		}
	})
}

const effectable = producer => {
	let effectList = makeEffectList()
	return statable(() => {
		env = { ...env, effectList }
		try {
			effectList.reset()
			return producer()
		} finally {
			effectList.reset()
		}
	})
}

const observable = producer => {
	let listener = null
	let subscribe = f => {
		if (listener) {
			throw new Error('Too much subscriber')
		}
		if (typeof f !== 'function') {
			throw new Error('listener must be function')
		}
		listener = f
	}
	let unsubscribe = () => {
		listener = null
	}
	let result = effectable(() => {
		let result = producer()
		if (listener) {
			listener(result)
		}
		return result
	})
	return { ...result, subscribe, unsubscribe }
}

const dispatchable = producer => {
	let effectList = null
	let dispatch = (action, payload) => {
		if (!effectList) {
			throw new Error('effect list is empty')
		}
		effectList.each(effect => effect.perform(action, payload))
	}
	let result = observable(() => {
		env = { ...env, dispatch }
		effectList = env.effectList
		return producer()
	})
	let unsubscribe = () => {
		result.unsubscribe()
		effectList.each(effect => effect.clean())
	}

	return {
		...result,
		unsubscribe,
		dispatch
	}
}

const POST = Symbol.for('@sukkula/post')
const usable = producer => {
	return dispatchable(() => {
		let result = producer()
		env.dispatch(POST)
		return result
	})
}

const useRef = initialValue => {
	if (!env) {
		throw new Error(`You can't use useRef outside the usable function`)
	}
	return env.refList.get(initialValue)
}

const useResume = () => {
	if (!env) {
		throw new Error(`You can't use useResume outside the usable function`)
	}
	return env.resume
}

const useDispatch = () => {
	if (!env) {
		throw new Error(`You can't use useDispatch outside the usable function`)
	}
	return env.dispatch
}

const useState = initialState => {
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
	if (!env) {
		throw new Error(`You can't use useEffect outside the usable function`)
	}
	env.effectList.get(action, handler, argList)
}

const usePostEffect = (handler, argList) => {
	useEffect(POST, handler, argList)
}

module.exports = {
	usable,
	useState,
	useEffect,
	usePostEffect,
	useRef,
	useResume,
	useDispatch,
	useGetSet
}
