const { PRE_EXECUTE, POST_EXECUTE } = require('./actions')
const {
	noop,
	deferred,
	isThenable,
	makeRefList,
	makeStateList,
	makeEffectList
} = require('./util')

let env = null
const getEnv = () => env

const runnable = producer => {
	let runing = false
	let rerun = false
	let run = props => {
		if (runing) {
			rerun = true
			return
		}

		let result
		try {
			env = { props }
			runing = true
			result = producer(props)
		} finally {
			runing = false
		}

		if (rerun) {
			rerun = false
			return run(props)
		}
		return result
	}
	return { run }
}

const resumable = producer => {
	let currentProps
	let resume = () => source.run(currentProps)
	let source = runnable(props => {
		currentProps = props
		try {
			env = { ...env, resume }
			return producer(props)
		} finally {
			env = null
		}
	})
	return { ...source, resume }
}

const referencable = producer => {
	let refList = makeRefList()
	let source = resumable(props => {
		env = { ...env, refList }
		try {
			refList.reset()
			return producer(props)
		} finally {
			refList.reset()
		}
	})
	return { ...source, refList }
}

const statable = producer => {
	let stateList = makeStateList()
	let source = referencable(props => {
		env = { ...env, stateList }
		try {
			stateList.reset()
			return producer(props)
		} finally {
			stateList.reset()
		}
	})
	return { ...source, stateList }
}

const effectable = producer => {
	let effectList = makeEffectList()
	let perform = (action, payload) => {
		effectList.each(effect => effect.perform(action, payload))
	}
	let clean = () => {
		effectList.each(effect => effect.clean())
	}
	let source = statable(props => {
		env = { ...env, effectList, perform }
		try {
			effectList.reset()
			return producer(props)
		} finally {
			effectList.reset()
		}
	})
	return { ...source, perform, clean }
}

const catchable = producer => {
	let handlerList = []
	let handleCatch = (target, resume) => {
		let index = 0
		while (index < handlerList.length) {
			try {
				return handlerList[index](target, resume)
			} catch (error) {
				if (error === target) {
					index += 1
				} else {
					throw error
				}
			}
		}
		throw target
	}
	let onCatch = f => {
		if (typeof f !== 'function') {
			throw new Error(`handleCatch must be a function`)
		}
		handlerList.push(f)
		return () => {
			let index = handlerList.indexOf(f)
			if (index !== -1) {
				handlerList.splice(index, 1)
			}
		}
	}
	let offCatch = () => (handlerList.length = 0)
	let source = effectable(props => {
		try {
			return producer(props)
		} catch (target) {
			if (handleCatch) {
				return handleCatch(target, source.resume)
			} else {
				throw target
			}
		}
	})
	return { ...source, onCatch, offCatch }
}

const iterable = producer => {
	let handlerList = []
	let handleNext = value => {
		handlerList.forEach(handler => handler(value))
	}
	let onNext = f => {
		if (typeof f !== 'function') {
			throw new Error(`handleNext must be a function`)
		}
		handlerList.push(f)
		return () => {
			let index = handlerList.indexOf(f)
			if (index !== -1) {
				handlerList.splice(index, 1)
			}
		}
	}
	let offNext = () => (handlerList.length = 0)
	let source = catchable(props => {
		let result = producer(props)
		if (handleNext) {
			handleNext(result)
		}
		return result
	})
	return { ...source, onNext, offNext }
}

const errorrable = producer => {
	let offList = []
	let onError = handleError => {
		if (typeof handleError !== 'function') {
			throw new Error(`handleError must be a function`)
		}
		let off = source.onCatch((target, resume) => {
			if (target instanceof Error) {
				return handleError(target, resume)
			}
			throw target
		})
		offList.push(off)
		return off
	}
	let offError = () => {
		let list = offList
		offList = []
		list.forEach(off => off())
	}
	let source = iterable(producer)
	return { ...source, onError, offError }
}

const suspensible = producer => {
	let source = errorrable(producer)
	source.onCatch((target, resume) => {
		if (isThenable(target)) {
			return target.then(() => resume())
		}
		throw target
	})
	return source
}

const subscribable = producer => {
	let onFinish = null
	let subscribe = (subscriber = {}) => {
		if (!subscriber) {
			let message = `Expected an object, but got ${subscriber} instead`
			throw new Error(message)
		}

		if (typeof subscriber.next === 'function') {
			source.onNext(result => subscriber.next)
		}

		if (typeof subscriber.error === 'function') {
			source.onError(subscriber.error)
		}

		if (typeof subscriber.catch === 'function') {
			source.onCatch(subscriber.catch)
		}

		if (typeof subscriber.finish === 'function') {
			onFinish = handleFinish
		}
	}
	let unsubscribe = () => {
		let finish = onFinish
		source.offNext()
		source.offError()
		source.offCatch()
		source.clean()
		if (finish) {
			finish()
		}
	}
	let source = suspensible(props => {
		env = { ...env, unsubscribe }
		return producer(props)
	})
	return { ...source, subscribe, unsubscribe }
}

const usable = producer => {
	let source = subscribable(producer)
	let run = props => {
		return Promise.resolve(source.run(props))
	}
	return { ...source, run, producer }
}

module.exports = {
	getEnv,
	usable
}
