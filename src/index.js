const { usable, getEnv, actions } = require('./core')

const useProps = () => {
	let env = getEnv()
	if (!env) {
		throw new Error(`You can't use useProps outside the usable function`)
	}
	return env.props
}

const useRef = initialValue => {
	let env = getEnv()
	if (!env) {
		throw new Error(`You can't use useRef outside the usable function`)
	}
	return env.refList.get(initialValue)
}

const useResume = () => {
	let env = getEnv()
	if (!env) {
		throw new Error(`You can't use useResume outside the usable function`)
	}
	return env.resume
}

const useDispatch = () => {
	let env = getEnv()
	if (!env) {
		throw new Error(`You can't use useDispatch outside the usable function`)
	}
	return env.dispatch
}

const useState = initialState => {
	let env = getEnv()
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
	let env = getEnv()
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
	let env = getEnv()
	if (!env) {
		throw new Error(`You can't use useEffect outside the usable function`)
	}
	env.effectList.get(action, handler, argList)
}

const usePostEffect = (handler, argList) => {
	useEffect(actions.POST, handler, argList)
}

const useUnsubscribe = () => {
	let env = getEnv()
	if (!env) {
		throw new Error(`You can't use useUnsubscribe outside the usable function`)
	}
	return env.unsubscribe
}

const run = (runnable, props) => {
	return runnable.run(props)
}

const subscribe = (subscribable, onNext, onFinish) => {
	if (typeof subscribable === 'object') {
		onFinish = subscribable.finish
		onNext = subscribable.next
		subscribable = subscribable.source
	}
	return subscribable.subscribe(onNext, onFinish)
}

const unsubscribe = subscribable => {
	if (subscribable) {
		subscribable.unsubscribe()
		return
	}
	let unsubscribe = useUnsubscribe()
	unsubscribe()
}

const dispatch = (dispatchable, action, payload) => {
	return dispatchable.dispatch(action, payload)
}

module.exports = {
	run,
	subscribe,
	unsubscribe,
	dispatch,
	usable,
	useState,
	useEffect,
	usePostEffect,
	useRef,
	useResume,
	useDispatch,
	useGetSet,
	useProps,
	useUnsubscribe
}
