import { START, NEXT, FINISH, ASYNC } from './constant'





const interval = period => sink => {
	let timer
	let i = 0
	return guard((type, payload) => {
		if (type === START) {
			timer = setInterval(() => sink(NEXT, i++), period)
			sink(START)
		} else if (type === FINISH) {
			clearInterval(timer)
			sink(FINISH)
		} else if (type === NEXT) {
			sink(ASYNC)
		} else {
			sink(type, payload)
		}
	})
}

const fromArray = array => sink => {
	let i = 0
	let callback = guard((type, payload) => {
		if (type === NEXT) {
			if (i < array.length) {
				sink(NEXT, array[i++])
				if (i === array.length) {
					callback(FINISH)
				}
			}
		} else if (type === FINISH) {
			sink(FINISH)
		} else {
			sink(type, payload)
		}
	})
	return callback
}

const map = f => source => sink => {
	return source((type, payload) => {
		sink(type, type === NEXT ? f(payload) : payload)
	})
}

const filter = f => source => sink => {
	let callback = source((type, payload) => {
		if (type === NEXT) {
			if (f(payload)) {
				sink(NEXT, payload)
			} else {
				callback(NEXT)
			}
		} else {
			sink(type, payload)
		}
	})
	return callback
}

const take = max => source => sink => {
	let count = 0
	let callback = source((type, payload) => {
		if (type === NEXT) {
			if (count < max) {
				count += 1
				sink(NEXT, payload)
				if (count === max) {
					callback(FINISH)
				}
			}
		} else if (type === FINISH) {
			sink(FINISH)
		} else {
			sink(type, payload)
		}
	})
	return callback
}

const concat = (...sourceList) => sink => {
	let index = 0
	let loopCallback = null
	let isStarted = false
	let loop = () => {
		if (index === sourceList.length) {
			if (index === 0) sink(START)
			callback(FINISH)
			return
		}
		loopCallback = sourceList[index++]((type, payload) => {
			if (type === START) {
				if (!isStarted) {
					isStarted = true
					sink(START)
				} else {
					loopCallback(NEXT)
				}
			} else if (type === NEXT) {
				sink(NEXT, payload)
			} else if (type === FINISH) {
				loop()
			} else {
				sink(type, payload)
			}
		})
		loopCallback(START)
	}
	let callback = guard((type, payload) => {
		if (type === START) {
			loop()
		} else if (type === FINISH) {
			loopCallback && loopCallback(FINISH)
			sink(FINISH)
		} else {
			loopCallback && loopCallback(type, payload)
		}
	})
	return callback
}

const share = source => {
	let list = []
	let isStarted = false
	let isFinished = false
	let listener = {
		start() {
			isStarted = true
			let sinkList = list.concat()
			for (let i = 0; i < sinkList.length; i++) {
				sinkList[i](START)
			}
		},
		next(payload) {
			let sinkList = list.concat()
			for (let i = 0; i < sinkList.length; i++) {
				sinkList[i](NEXT, payload)
			}
		},
		finish() {
			isFinished = true
			let sinkList = list.concat()
			for (let i = 0; i < sinkList.length; i++) {
				sinkList[i](FINISH)
			}
		}
	}
	let realCallback = source |> lazyForEach(listener)
	return sink => {
		let callback = guard((type, payload) => {
			if (type === START) {
				if (!isStarted) {
					realCallback(START)
				} else {
					sink(START)
				}
			} else if (type === NEXT) {
				if (isFinished) {
					sink(FINISH)
				} else {
					sink(ASYNC)
				}
			} else if (type === FINISH) {
				let index = list.indexOf(sink)
				if (index !== -1) {
					list.splice(index, 1)
				}
				if (list.length === 0) {
					realCallback(FINISH)
				} else {
					sink(FINISH)
				}
			} else {
				realCallback(type, payload)
			}
		})
		list.push(sink)
		return callback
	}
}

const takeUntil = until$ => source => sink => {
	let innerCallback = null
	let callback = source((type, payload) => {
		if (type === START) {
			innerCallback = until$ |> take(1) |> lazyForEach(() => callback(FINISH))
			innerCallback(START)
		} else if (type === FINISH) {
			innerCallback(FINISH)
			sink(FINISH)
		} else {
			sink(type, payload)
		}
	})
	return callback
}

const switchMap = makeSource => source => sink => {
	let innerCallback = null
	let next = payload => sink(NEXT, payload)
	let finish = () => {
		innerCallback = null
		callback(NEXT)
	}
	let callback = source((type, payload) => {
		if (type === NEXT) {
			innerCallback && innerCallback(FINISH)
			innerCallback = makeSource(payload) |> lazyForEach(next, finish)
			innerCallback(START)
		} else if (type === FINISH) {
			innerCallback && innerCallback(FINISH)
			sink(FINISH)
		} else {
			sink(type, payload)
		}
	})
	return guard((type, payload) => {
		if (type === ASYNC) {
			callback(NEXT)
		} else if (type === NEXT) {
			if (innerCallback) {
				innerCallback(NEXT)
			} else {
				callback(NEXT)
			}
		} else {
			callback(type, payload)
		}
	})
}

const forEach = (next, finish) => {
	let listener = {}
	if (typeof next === 'object') {
		listener = next
	} else {
		if (typeof next === 'function') listener.next = next
		if (typeof finish === 'function') listener.finish = finish
	}
	return source => {
		let callback = source((type, payload) => {
			if (type === START) {
				listener.start && listener.start()
				callback(NEXT)
			} else if (type === NEXT) {
				listener.next && listener.next(payload)
				callback(NEXT)
			} else if (type === FINISH) {
				listener.finish && listener.finish()
			}
		})
		callback(START)
		return callback
	}
}

const lazyForEach = (next, finish) => {
	let listener = {}
	if (typeof next === 'object') {
		listener = next
	} else {
		if (typeof next === 'function') listener.next = next
		if (typeof finish === 'function') listener.finish = finish
	}
	return source => {
		let callback = source((type, payload) => {
			if (type === START) {
				listener.start && listener.start()
				callback(NEXT)
			} else if (type === NEXT) {
				listener.next && listener.next(payload)
				callback(NEXT)
			} else if (type === FINISH) {
				listener.finish && listener.finish()
			}
		})
		return callback
	}
}

// interval(1000)
fromArray([1, 2])
	|> switchMap(n => fromArray([n + 1, n + 2, n + 3, n + 4]) |> switchMap(n => interval(300) |> take(1)))
	|> forEach(count => console.log('switch-map', count))

// interval(3000)
//   |> switchMap(count => interval(300) |> log(`inner-interval:${count}`) |> take(5))
//   |> forEach(count => console.log('switch-map', count))

// takeUntil
// interval(300)
//   |> takeUntil(interval(1000) |> log('interval'))
//   |> forEach(
//     count => console.log('count', count),
//     () => console.log('count finish')
//   )

// const MOVE = Symbol('move')
// const END = Symbol('end')
// const testSource = sink => {
//   let callback = guard((type, payload) => {
//     if (type === MOVE) {
//       sink(NEXT, payload)
//     } else if (type === END) {
//       callback(FINISH)
//     } else if (type === FINISH) {
//       sink(FINISH)
//     } else if (type === NEXT) {
//       sink(ASYNC)
//     } else {
//       sink(type, payload)
//     }
//   })
//   return callback
// }

// const testSource$ =
//   testSource |> map(n => n + 1) |> filter(n => n > 3) |> take(0) |> share

// const testCallback1 =
//   testSource$
//   |> forEach(
//     value => console.log('testCallback1', value),
//     () => console.log('testCallback1 finish')
//   )

// const testCallback2 =
//   testSource$
//   |> forEach(
//     value => console.log('testCallback2', value),
//     () => console.log('testCallback2 finish')
//   )

// testCallback1(MOVE, 1)
// testCallback2(MOVE, 2)
// testCallback1(MOVE, 3)
// testCallback1(MOVE, 4)
// testCallback2(MOVE, 5)
// testCallback1(END)
// testCallback2(END)

// interval(300)
// 	|> log('interval')
// 	|> take(10)
// 	|> forEach(count => console.log('count', count), () => console.log('finish'))

// interval(1000) |> take(3) |> forEach(count => console.log('count', count), () => console.log('finish'))

// concat(fromArray([1, 2, 3]), fromArray([4]), fromArray([5, 6, 7]), interval(300) |> log('interval'))
// 	|> filter(n => n !== 6)
// 	|> take(8)
// 	|> forEach(count => console.log('count', count), () => console.log('finish'))

// let interval$ = interval(1000) |> take(3) |> share

// interval$
// 	|> forEach({
// 		start() {
// 			console.log('count start')
// 		},
// 		next(count) {
// 			console.log('count', count)
// 		},
// 		finish() {
// 			console.log('count finish')
// 		}
// 	})

// setTimeout(() => {
// 	interval$
// 		|> take(5)
// 		|> forEach({
// 			start() {
// 				console.log('async count start')
// 			},
// 			next(count) {
// 				console.log('async count', count)
// 			},
// 			finish() {
// 				console.log('async count finish')
// 			}
// 		})
// }, 2000)

// setTimeout(() => {
// 	interval$
// 		|> take(2)
// 		|> forEach({
// 			start() {
// 				console.log('async count-2 start')
// 			},
// 			next(count) {
// 				console.log('async count-2', count)
// 			},
// 			finish() {
// 				console.log('async count-2 finish')
// 			}
// 		})
// }, 3000)

const dispatch = (type, data) => callback => callback(type, data)

const toDispatch = callback => (...args1) => (...args2) => callback(...args1.concat(args2))

const toReactComponent = render => source => {
	return class extends React.Component {
		dispatch = source |> forEach(state => this.setState(state)) |> toDispatch
		render() {
			return render(this.state, dispatch)
		}
	}
}

const fromAction = actionType => sink => {
	let callback = (type, data) => {
		if (type === actionType) sink(data, callback)
	}
	return callback
}

const getEvent = event => (event.touches ? event.touches[0] : event)

const getCoords = downEvent => {
	let startX = downEvent.clientX
	let startY = downEvent.clientY
	return moveEvent => {
		moveEvent.preventDefault()
		downEvent = getEvent(downEvent)
		moveEvent = getEvent(moveEvent)
		return {
			left: moveEvent.clientX - startX,
			top: moveEvent.clientY - startY
		}
	}
}

// const Ball =
//   fromAction('start')
//   |> switchMap(downEvent => {
//     let move$ = fromAction('move') |> map(getCoords(downEvent)) |> share

//     move$ |> takeUntil(fromAction('end'))
//   })
//   |> startWith({ left: 0, top: 0 })

// const spring$ =
//   spring(springOptions)
//   |> takeUntil(start$)
//   |> map(({ currentValue }) => currentValue)
//   |> sampleCombine(latest(coords$))
//   |> map(([current, { left, top }]) => {
//     return {
//       left: left * current,
//       top: top * current
//     }
//   })

// concat(fromIter([1, 2, 3]), fromIter([4, 5, 6]))

// const makeCount = () => sink => {
//   let done = false
//   let callback = (type = 0, data) => {
//     console.log('makeCount', type, data)
//     if (done) return
//     if (type === 0) done = true
//     if (type === 'test') sink(data, callback)
//   }
//   return callback
// }

// makeCount()
//   |> map(n => n + 1)
//   |> switchMap(n => interval(2000) |> take(1) |> log('switch') |> map(() => n))
//   |> take(10)
//   |> forEach((data, callback) => {
//     console.log('for-each', data)
//     setTimeout(() => {
//       callback('test', data + 1)
//     }, 1000)
//   })
//   |> dispatch('test', 0)

// let interval$ = interval(1000) |> takeUntil(interval(10000)) |> share

// interval$
//   |> forEach(count => {
//     console.log('count', count)
//   })

// setTimeout(() => {
//   interval$
//     |> log('interval')
//     |> switchMap(() => interval(200))
//     |> forEach(count => {
//       console.log('switch map count', count)
//     })
// }, 2000)
