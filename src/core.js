const { shallowEqualList, makeList, makeDict } = require('./util')

let env = null
const getEnv = () => env

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

const runnable = producer => {
	let runing = false
	let rerun = false
	let run = context => {
		if (runing) {
			rerun = true
			return
		}

		let result
		try {
			env = { context }
			runing = true
			result = producer(context)
		} finally {
			runing = false
		}

		if (rerun) {
			rerun = false
			return run(context)
		}
		return result
	}
	return { run }
}

const resumable = producer => {
	let currentContext = null
	let resume = () => run(currentContext)
	let { run } = runnable(context => {
		try {
			env = { ...env, resume }
			currentContext = env.context
			return producer(context)
		} finally {
			env = null
		}
	})
	return { run }
}

const referencable = producer => {
	let refList = makeRefList()
	return resumable(context => {
		env = { ...env, refList }
		try {
			refList.reset()
			return producer(context)
		} finally {
			refList.reset()
		}
	})
}

const statable = producer => {
	let stateList = makeStateList()
	return referencable(context => {
		env = { ...env, stateList }
		try {
			stateList.reset()
			return producer(context)
		} finally {
			stateList.reset()
		}
	})
}

const effectable = producer => {
	let effectList = makeEffectList()
	return statable(context => {
		env = { ...env, effectList }
		try {
			effectList.reset()
			return producer(context)
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
	let result = effectable(context => {
		let result = producer(context)
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
	let result = observable(context => {
		env = { ...env, dispatch }
		effectList = env.effectList
		return producer(context)
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
	return dispatchable(context => {
		let result = producer(context)
		env.dispatch(POST)
		return result
	})
}

const actions = {
	POST
}

module.exports = {
	getEnv,
	usable,
	actions
}
