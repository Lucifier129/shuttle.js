import { START, NEXT, FINISH, ASYNC } from 'sukkula/src/constant'
import { log, logValue } from 'sukkula/src/utility'
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
  startWith
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
  let start$ = fromAction(action.START) |> logValue('start')
  let move$ = fromAction(action.MOVE) |> logValue('move')
  let end$ = fromAction(action.END) |> logValue('end')

  let position$ =
    start$
    |> switchMap(
      downEvent => move$ |> takeUntil(end$) |> map(getCoords(downEvent))
    )
    |> startWith({ left: 0, top: 0 })

  let status$ =
    merge(start$ |> mapTo(true), end$ |> mapTo(false)) |> startWith(false)

  let data$ =
    combineObject({
      position: position$,
      status: status$
    })
    |> map(data => {
      if (data.status) {
        return data.position
      } else {
        return { left: 0, top: 0 }
      }
    })

  return {
    data$: data$,
    action
  }
}

function dragBall(elem) {
  let { data$, action } = drag()
  let callback =
    data$
    |> onNext(data => {
      console.log('data', data)
      setTranslate(elem, data)
    })
    |> start

  elem.addEventListener('mousedown', event => {
    callback(action.START, event)
  })
  document.addEventListener('mousemove', event => callback(action.MOVE, event))
  document.addEventListener('mouseup', event => callback(action.END, event))
}

dragBall(document.querySelector('.ball'))
