const {
  usable,
  useState,
  useEffect,
  usePerform,
  useOnNext
} = require('./index')

const count$ = usable(props => {
  let [count, setCount] = useState(props.count)
  let perform = usePerform()

  useEffect((payload, action) => {
    console.log('effect', { action, payload, count })
  })

  useEffect('incre', () => setCount(count + 1))

  useEffect('decre', () => setCount(count - 1))

  useOnNext(() => {
    let timer = setInterval(() => perform('incre'), 1000)
    return () => {
      console.log('clear')
      clearInterval(timer)
    }
  }, [])

  if (count === 12) {
    throw new Error('test error')
  }

  return count
})

let trigger = count$.use({
  next: count => {
    console.log('count', count)
    if (count === 20) trigger.complete()
  },
  complete: count => {
    console.log('last-count', count)
  },
  error: error => {
    console.log('error', error)
  },
  catch: catchable => {
    console.log('catchable', catchable)
  }
})

trigger.next({ count: 10 })

trigger.catch('xxx')
