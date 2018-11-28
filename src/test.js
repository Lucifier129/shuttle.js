const {
  run,
  subscribe,
  unsubscribe,
  usable,
  useState,
  useGetSet,
  useEffect,
  useDispatch
} = require('./index')

const count$ = usable(props => {
  let [count, setCount] = useState(props.count)
  let dispatch = useDispatch()

  useEffect('incre', () => setCount(count + 1))

  useEffect('decre', () => setCount(count - 1))

  useEffect(() => {
    let timer = setInterval(() => dispatch('incre'), 1000)
    return () => clearInterval(timer)
  }, [])

  if (count === 12) {
    throw new Error('test error')
  }

  return count
})

subscribe({
  source: count$,
  next: count => {
    console.log('count', count)
    if (count === 20) unsubscribe()
  },
  finish: count => {
    console.log('last-count', count)
  },
  effect: effect => {
    console.log('effect', effect)
  }
})

run(count$, { count: 10 })
