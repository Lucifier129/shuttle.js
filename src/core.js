const { NEXT, ERROR, CATCH, SUSPENSE } = require('./constant')
const {
	noop,
	pipe,
	deferred,
	isThenable,
	makeRefList,
	makeStateList,
	makeEffectList
} = require('./util')

let env = null
const getEnv = () => env

const resumable = producer => {
	let runing = false
	let rerun = false
	let currentProps
	let resume = (props = currentProps) => {
		currentProps = props
		if (runing) {
			rerun = true
			return
		}

		let result
		try {
			env = { ...env, props, resume }
			runing = true
			result = producer(props)
		} finally {
			runing = false
		}

		if (rerun) {
			rerun = false
			return resume()
		}
		return result
	}
	return resume
}

const referencable = producer => {
	let refList = makeRefList()
	return props => {
		env = { ...env, refList }
		try {
			refList.reset()
			return producer(props)
		} finally {
			refList.reset()
		}
	}
}

const statable = producer => {
	let stateList = makeStateList()
	return props => {
		env = { ...env, stateList }
		try {
			stateList.reset()
			return producer(props)
		} finally {
			stateList.reset()
		}
	}
}

const effectable = producer => {
	let effectList = makeEffectList()
	let perform = (action, payload) => {
		if (env) {
			throw new Error(`You can't perform effect in usable function directly`)
		}
		let performed = false
		effectList.each(effect => {
			if (effect.perform(action, payload)) {
				performed = true
			}
		})
		return performed
	}
	let clean = () => {
		if (env) {
			throw new Error(`You can't cleanup in usable function directly`)
		}
		effectList.each(effect => effect.clean())
	}
	return props => {
		env = { ...env, effectList, perform, clean }
		try {
			effectList.reset()
			return producer(props)
		} finally {
			effectList.reset()
		}
	}
}

const hookable = pipe(
	referencable,
	statable,
	effectable,
	resumable
)

const defaultObserver = {
	next: noop,
	error: null,
	catch: null,
	complete: noop,
	action: noop
}

const observable = observer => producer => {
	observer = { ...defaultObserver, ...observer }
	let hasErrorHandler = typeof observer.error === 'function'
	let hasCatchableHandler = typeof observer.catch === 'function'
	let isUnsubscribe = false
	let lastEnv
	let lastResult
	let run = hookable(props => {
		if (isUnsubscribe) return
		try {
			lastResult = producer(props)
		} catch (catchable) {
			lastEnv = env
			env = null

			// handle error
			if (catchable instanceof Error) {
				if (hasErrorHandler) {
					observer.error(catchable)
				}
				let performed = perform(ERROR, catchable)
				if (!performed && !hasErrorHandler) {
					throw catchable
				}
				return
			}

			// handle promise
			if (isThenable(catchable)) {
				catchable.then(() => env.resume())
				perform(SUSPENSE, catchable)
				return
			}

			// handle custom catchable
			if (hasCatchableHandler) {
				observer.catch(catchable, env.resume)
			}
			let performed = perform(CATCH, catchable)
			if (!performed && !hasCatchableHandler) {
				throw catchable
			}
			return
		}
		lastEnv = env
		env = null
		observer.next(lastResult, unsubscribe)
		if (!isUnsubscribe) {
			perform(NEXT, lastResult)
		}
	})
	let unsubscribe = () => {
		if (isUnsubscribe) return
		isUnsubscribe = true
		let env = lastEnv
		lastEnv = null
		if (env) {
			env.clean()
		}
		observer.complete(lastResult)
	}
	let perform = (action, payload) => {
		if (!lastEnv) {
			throw new Error(`You are performing effect before calling run method`)
		}
		let shouldPerform = observer.action(action, payload)
		if (shouldPerform !== false) {
			lastEnv.perform(action, payload)
		}
	}
	return { run, unsubscribe, perform }
}

const usable = producer => {
	let subscribe = observer => observable(observer)(producer)
	return { subscribe }
}

module.exports = {
	getEnv,
	usable
}
