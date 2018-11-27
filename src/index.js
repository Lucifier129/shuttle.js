const { usable, getEnv, actions } = require('./core')

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
