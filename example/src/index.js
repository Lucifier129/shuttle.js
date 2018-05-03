import { log, logValue, guard, noop } from 'sukkula/src/utility'
import { interval, fromArray, fromRange, fromEvent } from 'sukkula/src/source'
import { onStart, onNext, onFinish, run, pullable } from 'sukkula/src/sink'
import {
	map,
	mapTo,
	filter,
	take,
	takeUntil,
	merge,
	mergeWith,
	concat,
	combine,
	combineObject,
	switchMap,
	startWith,
	takeLast,
	then
} from 'sukkula/src/operator'
import { Spring } from 'wobble'
import EventEmitter from 'events'

const springOptions = {
	fromValue: 1,
	toValue: 0,
	stiffness: 1000,
	damping: 20,
	mass: 3
}

const spring = options => sink => {
	let instance = new Spring({ ...springOptions, ...options })
	let action = guard({
		...sink,
		start: () => {
			instance.start()
			instance.onUpdate(data => sink.next(data))
			instance.onStop(() => action.finish())
			sink.start()
		},
		next: noop,
		finish: () => {
			instance.stop()
			sink.finish()
		}
	})
	return action
}

const getEvent = event => (event.touches ? event.touches[0] : event)

const getCoords = downEvent => {
	downEvent = getEvent(downEvent)
	let startX = downEvent.clientX
	let startY = downEvent.clientY
	return moveEvent => {
		moveEvent.preventDefault()
		moveEvent = getEvent(moveEvent)
		return {
			left: moveEvent.clientX - startX,
			top: moveEvent.clientY - startY
		}
	}
}

const setTranslate = (elem, { left, top }) => {
	let translate = `translate(${left}px, ${top}px)`
	elem.style.transform = translate
	elem.style.webkitTransform = translate
}

function drag() {
	let emitter = new EventEmitter()
	let symbol = {
		start: Symbol('start'),
		move: Symbol('move'),
		end: Symbol('end')
	}
	let start$ = fromEvent(emitter, symbol.start)
	let move$ = fromEvent(emitter, symbol.move)
	let end$ = fromEvent(emitter, symbol.end)
	let makeSpring = coords =>
		spring()
		|> takeUntil(start$)
		|> map(({ currentValue }) => {
			return {
				left: coords.left * currentValue,
				top: coords.top * currentValue
			}
		})
	let coords$ =
		start$
		|> switchMap(downEvent => move$ |> map(getCoords(downEvent)) |> takeUntil(end$) |> then(makeSpring))
		|> startWith({ left: 0, top: 0 })

	let handler = {
		start: value => emitter.emit(symbol.start, value),
		move: value => emitter.emit(symbol.move, value),
		end: value => emitter.emit(symbol.end, value)
	}

	return {
		data$: coords$,
		handler,
		emitter,
		symbol
	}
}

function dragBall(elem) {
	let { data$, handler } = drag()
	let options = { passive: false }

	fromEvent(elem, 'mousedown', options)
		|> mergeWith(fromEvent(elem, 'touchstart', options))
		|> run(handler.start)

	fromEvent(document, 'mousemove', options)
		|> mergeWith(fromEvent(document, 'touchmove', options))
		|> run(handler.move)

	fromEvent(document, 'mouseup', options)
		|> mergeWith(fromEvent(document, 'touchend', options))
		|> run(handler.end)

	data$
		|> run(({ left, top }) => {
			let styleValue = `translate(${left}px, ${top}px)`
			elem.style.transform = styleValue
			elem.style.webkitTransform = styleValue
		})
}

dragBall(document.querySelector('.ball'))
