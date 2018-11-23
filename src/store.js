function shallowEqual(objA, objB) {
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

function shallowEqualList(listA, listB) {
	if (!Array.isArray(listA) || !Array.isArray(listB)) return false
	if (listA.length !== listB.length) return false
	for (let i = 0; i < listA.length; i++) {
		if (!shallowEqual(listA[i], listB[i])) {
			return false
		}
	}
	return true
}

const emptyList = []

let current = null
let stateIndex = 0
let effectIndex = 0
let refIndex = 0

const useState = defaultValue => {
	if (!current)
		throw new Error(`You can't use useState outside the usable function`)
	return current.getState(stateIndex++, defaultValue)
}

const useEffect = (action, handler) => {
	if (!current)
		throw new Error(`You can't use useEffect outside the usable function`)
	if (typeof action === 'function') {
		argList = handler
		handler = action
		action = POST_EFFECT
	}
	current.setEffect(effectIndex++, action, handler)
}

const useRef = () => {
	if (!current)
		throw new Error(`You can't use useRef outside the usable function`)
	return current.getRef(refIndex++)
}

const useGetSet = defaultValue => {
	let ref = useRef()
	let [value, setValue] = useState(defaultValue)
	let getValue = () => ref.current
	ref.current = value
	return [getValue, setValue]
}

const useMemoEffect = (action, handler, argList) => {
	let ref = useRef()

	if (!ref.current) {
		ref.current = {
			action,
			handler,
			argList,
			clean: null,
			shouldPerform: true,
			handleEffect: (payload, action) => {
				if (!ref.current.shouldPerform) return
				ref.current.shouldPerform = false
				ref.current.clean = ref.current.handler(payload, action)
				return ref.current.handleClean
			},
			handleClean: isDestroy => {
				if (!ref.current.shouldPerform) return
				let clean = ref.current.clean
				ref.current.clean = null
				if (typeof clean === 'function') clean(isDestroy)
			}
		}
	}

	if (!ref.current.shouldPerform) {
		ref.current.shouldPerform =
			ref.current.action !== action ||
			shallowEqualList(ref.current.argList, argList)
	}

	if (ref.current.shouldPerform) {
		ref.current.handler = handler
	}

	useEffect(action, ref.current.handleEffect)
}

const POST_EFFECT = Symbol('post-effect')

const usable = producer => {
	let stateList = []
	let updateState = index => nextValue => {
		stateList[index][0] = nextValue
		produce()
	}
	let getState = (index, defaultValue) => {
		if (!stateList[index]) {
			stateList[index] = [defaultValue, updateState(index)]
		}
		return stateList[index]
	}

	let refList = []
	let getRef = index => {
		if (!refList[index]) {
			refList[index] = { current: null }
		}
		return refList[index]
	}

	let effectList = []
	let setEffect = (index, action, handler) => {
		let effect = effectList[index]
		if (!effect) {
			effectList[index] = {
				action,
				handler,
				clean: null
			}
			return
		}
		effect.action = action
		effect.handler = handler
	}
	let performEffectList = (action, payload) => {
		for (let i = 0; i < effectList.length; i++) {
			let effect = effectList[i]
			if (effect.action === action) {
				cleanEffect(effect)
				effect.clean = effect.handler(payload, action)
			}
		}
	}
	let cleanEffect = (effect, isDestroy) => {
		let { clean } = effect
		effect.clean = null
		if (typeof clean === 'function') clean(!!isDestroy)
	}
	let cleanEffectList = isDestroy => {
		for (let i = 0; i < effectList.length; i++) {
			cleanEffect(effectList[i], isDestroy)
		}
	}

	let hasPending = false

	let produce = () => {
		if (current === internal) {
			return (hasPending = true)
		}
		let previous = current
		current = internal
		stateIndex = 0
		effectIndex = 0
		refIndex = 0
		let result = producer()
		current = previous
		if (hasPending) {
			hasPending = false
			produce()
		} else {
			publish(result)
			dispatch(POST_EFFECT)
		}
	}

	let currentAction = null
	let currentPayload = null
	let dispatch = (action, payload) => {
		currentAction = action
		currentPayload = payload
		performEffectList(action, payload)
		currentAction = null
		currentPayload = null
	}

	let listenerList = []
	let subscribe = listener => {
		if (!listenerList.includes(listener)) {
			listenerList.push(listener)
		}
		return () => {
			let index = listenerList.indexOf(listener)
			if (index !== -1) listenerList.splice(index, 1)
		}
	}
	let publish = result => {
		for (let i = 0; i < listenerList.length; i++) {
			listenerList[i](result, currentAction, currentPayload)
		}
	}

	let isInited = false
	let init = () => {
		if (isInited) return
		isInited = true
		produce()
	}

	let isDestroyed = false
	let destroy = () => {
		isDestroyed = true
		listenerList.length = 0
		refList.length = 0
		cleanEffectList(true)
		cleanList.length = 0
		stateList.length = 0
	}

	let internal = {
		getState,
		setEffect,
		getRef
	}

	let protect = obj => {
		return Object.keys(obj).reduce((result, key) => {
			result[key] = (...args) => {
				if (isDestroyed) return
				return obj[key](...args)
			}
			return result
		}, {})
	}

	return protect({
		init,
		destroy,
		dispatch,
		subscribe
	})
}

export { usable, useState, useEffect, useRef, useGetSet }
