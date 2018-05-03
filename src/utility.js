export const pipe = (...args) => args.reduce((result, f) => f(result))
export const noop = () => {}
export const identity = x => x
export const constant = value => () => value

export const mapValue = (obj, f) =>
	Object.keys(obj).reduce((result, key) => {
		result[key] = f(key, obj[key])
		return result
	}, {})

export const guard = action => {
	let started = false
	let finished = false
	let start = () => {
		if (started || finished) return
		started = true
		action.start()
	}
	let next = () => {
		if (!started) throw new Error('call [next] before [start]')
		if (finished) return
		action.next()
	}
	let finish = () => {
		if (finished) return
		finished = true
		if (!started) return
		action.finish()
	}
	let error = error => {
		if (!started) throw new Error('call [next] before [start]')
		if (finished) return
		action.error(error)
	}
	return {
		...action,
		start,
		next,
		finish,
		error,
		original: action
	}
}

export const log = name => source => sink => {
	return source({
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
}

export const logValue = name => source => sink => {
	return source({
		...sink,
		next: value => {
			console.log(name, 'next', value)
			sink.next(value)
		}
	})
}

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
	return guard({
		start: () => {
			console.log(name, 'action:start')
			action.start()
		},
		next: value => {
			console.log(name, 'action:next', value)
			action.next(value)
		},
		finish: () => {
			console.log(name, 'action:finish')
			action.finish()
		},
		error: error => {
			console.log(name, 'action:error', error)
			action.error(error)
		}
	})
}
