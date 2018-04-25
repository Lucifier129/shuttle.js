import { START, NEXT, FINISH, ASYNC } from 'sukkula/src/constant'
import { log, logValue, guard } from 'sukkula/src/utility'
import { interval, fromArray, fromRange, fromAction } from 'sukkula/src/source'
import { onStart, onNext, onFinish, observe, start } from 'sukkula/src/sink'
import {
	map,
	mapTo,
	filter,
	take,
	takeUntil,
	merge,
	concat,
	combine,
	combineObject,
	switchMap,
	share,
	startWith,
	takeLast,
	skip,
	then
} from 'sukkula/src/operator'
import { Spring } from 'wobble'

const springOptions = {
	fromValue: 1,
	toValue: 0,
	stiffness: 1000,
	damping: 20,
	mass: 3
}

const spring = options => sink => {
	let instance = new Spring({ ...springOptions, ...options })
	let callback = guard((type, payload) => {
		if (type === START) {
			instance.start()
			instance.onUpdate(data => sink(NEXT, data))
			instance.onStop(() => callback(FINISH))
			sink(START)
		} else if (type === NEXT) {
			sink(ASYNC)
		} else if (type === FINISH) {
			instance.stop()
			sink(FINISH)
		} else {
			sink(type, payload)
		}
	})
	return callback
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
	let action = {
		START: Symbol('start'),
		MOVE: Symbol('move'),
		END: Symbol('end')
	}
	let start$ = fromAction(action.START)
	let move$ = fromAction(action.MOVE)
	let end$ = fromAction(action.END)
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
    |> switchMap(downEvent => 
      move$
        |> map(getCoords(downEvent))
        |> takeUntil(end$)
        |> then(makeSpring))
    |> startWith({ left: 0, top: 0 })
  

	return {
		position$: coords$,
		action
	}
}

function dragBall(elem) {
	let setTranslate = ({ left, top }) =>
		(elem.style.transform = elem.style.webkitTransform = `translate(${left}px, ${top}px)`)
	let { position$, action } = drag()
	let callback = position$ |> onNext(setTranslate) |> start
	let handleStart = event => callback(action.START, event)
	let handleMove = event => callback(action.MOVE, event)
	let handleEnd = event => callback(action.END, event)
	let eventOptions = { passive: false }
	elem.addEventListener('mousedown', handleStart, eventOptions)
	document.addEventListener('mousemove', handleMove, eventOptions)
	document.addEventListener('mouseup', handleEnd, eventOptions)
	elem.addEventListener('touchstart', handleStart, eventOptions)
	document.addEventListener('touchmove', handleMove, eventOptions)
	document.addEventListener('touchend', handleEnd, eventOptions)
}

dragBall(document.querySelector('.ball'))
