let env = null

const useList = (initialList = []) => {
	let list = initialList
	let has = (index = result.offset) => list.length > index
	let get = (index = result.offset) => list[index]
	let set = (val, index = result.offset) => (list[index] = val)
	let getAll = () => list
	let result = { has, get, set, offset: 0, getAll }
	return result
}

const useDict = (initialDict = {}) => {
	let dict = initialDict
	let has = key => dict.hasOwnProperty(key)
	let get = key => dict[key]
	let set = (val, key) => (dict[key] = val)
	let getAll = () => dict
	return { has, get, set, getAll }
}

const RESUME = Symbol.for('@sukkula/resume')

const usable = producer => {
	let values = useList()
	let states = useList()
	let effects = useList()
	let configs = useDict()
	let internal = { values, states, effects, configs }
	let run = (...args) => {
		if (env) return producer(...args)
		configs.set(() => run(...args), RESUME)
		env = internal
		values.offset = states.offset = effects.offset = 0
		try {
			return producer(...args)
		} finally {
			values.offset = states.offset = effects.offset = 0
			env = null
		}
	}
	return run
}

const useRef = initialValue => {
	if (!env) {
		throw new Error(`You can't use useRef outside the usable function`)
	}
	let { has, set, get, offset } = env.values
	if (!has(offset)) {
		set({ current: initialValue }, offset)
	}
	return get(env.values.offset++)
}

const useResume = () => {
	if (!env) {
		throw new Error(`You can't use useResume outside the usable function`)
	}
	let ref = useRef()
	ref.current = env.configs.get(RESUME)
	return ref
}

const useState = initialState => {
	if (!env) {
		throw new Error(`You can't use useState outside the usable function`)
	}
	let { has, get, set, offset } = env.states
	let resume = useResume()
	if (!has(offset)) {
		let setState = value => {
			val[0] = value
			resume.current()
		}
		let val = [initialState, setState]
		set(val, offset)
	}
	return get(env.states.offset++)
}

const useGetSet = initialState => {
	if (!env) {
		throw new Error(`You can't use useGetSet outside the usable function`)
	}
	let { has, get, set, offset } = env.states
	let resume = useResume()
	if (!has(offset)) {
		let getState = () => ref[2]
		let setState = value => {
			ref[2] = value
			resume.current()
		}
		let ref = [getState, setState, initialState]
		set(ref, offset)
	}
	return get(env.states.offset++)
}

const POST = Symbol.for('@sukkula/post')
const observable = (producer, listener) => {
	let isUnlistener = false
	let unlistener = () => {
		if (isUnlistener) return
		isUnlistener = true
		unsubscribe()
	}
	let cleanEffect = effect => {
		let clean = effect.clean
		effect.clean = null
		if (typeof clean === 'function') {
			clean()
		}
	}
	let performEffect = (effect, action, payload) => {
		if (effect.action !== action || effect.perform) return
		cleanEffect(effect)
		effect.perform = true
		effect.clean = effect.handler(payload, POST)
	}
	let publish = () => {
		let list = lastEffects ? lastEffects.getAll() : []
		list.forEach(effect => performEffect(effect, POST))
	}
	let unsubscribe = () => {
		let list = lastEffects ? lastEffects.getAll() : []
		list.forEach(cleanEffect)
	}
	let lastEffects = null
	let shouldRerun = false
	let run = usable((...args) => {
		if (shouldRerun) if (isUnlistener) return
		let { effects } = env
		listener(producer(...args))
		lastEffects = effects
		publish()
	})
	run()
	return unlistener
}

const useEffect = (action, handler, argList) => {
	if (!env) {
		throw new Error(`You can't use useEffect outside the usable function`)
	}

	let { has, get, set, offset } = env.effects

	if (!has(offset)) {
		set({ action, handler, argList, clean: null, perform: false }, offset)
	}

	let effect = get(env.effects.offset++)
	let isEqualAction = effect.action === action
	let isEqualArgList = shallowEqualList(effect.argList, argList)

	if (!isEqualAction || !isEqualArgList) {
		effect.handler = handler
		effect.perform = false
	}

	effect.action = action
	effect.argList = argList
}

let unscribe = observable(
	() => {
		let [getCount, setCount] = useGetSet(10)

		useEffect(
			POST,
			() => {
				console.log('effect')
				let timer = setInterval(() => setCount(getCount() + 1), 1000)
				return () => {
					console.log('clear')
					clearInterval(timer)
				}
			},
			[]
		)

		return getCount()
	},
	count => {
		console.log('count', count)
		if (count === 20) unscribe()
	}
)

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
