import '@babel/polyfill'
import React from 'react'
import ReactDOM from 'react-dom'
import {
  usable,
  useState,
  useEffect,
  useRef,
  useGetSet,
  useRaise,
  useSuspense
} from 'sukkula'

const useWindowWidth = () => {
  let [getWidth, setWidth] = useGetSet(window.innerWidth)

  useEffect(() => {
    let handleResize = () => {
      if (getWidth() !== window.innerWidth) {
        console.log('set-width')
        setWidth(window.innerWidth)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => {
      console.log('clear-width')
      window.removeEventListener('resize', handleResize)
    }
  }, [])
  return getWidth()
}

const useWindowHeight = () => {
  let [getHeight, setHeight] = useGetSet(window.innerHeight)
  useEffect(() => {
    let handleResize = () => {
      if (getHeight() !== window.innerHeight) {
        console.log('set-height')
        setHeight(window.innerHeight)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => {
      console.log('clear-height')
      window.removeEventListener('resize', handleResize)
    }
  }, [])
  return getHeight()
}

const useWindowSize = () => {
  let width = useWindowWidth()
  let height = useWindowHeight()
  return {
    width,
    height
  }
}

const useText = () => {
  let [text, setText] = useState('')
  useEffect('set-text', setText)
  return text
}

const useTodos = () => {
  let [todos, setTodos] = useState([])

  useEffect('add-todo', content => {
    let todo = {
      id: Date.now(),
      content,
      completed: false
    }
    setTodos(todos.concat(todo))
  })

  useEffect('update-todo', ({ id, ...data }) => {
    let newTodos = todos.map(todo => {
      if (todo.id !== id) return todo
      return { ...todo, ...data }
    })
    setTodos(newTodos)
  })

  useEffect('remove-todo', id => {
    let newTodos = todos.filter(todo => todo.id !== id)
    setTodos(newTodos)
  })

  useEffect('toggle-todo', id => {
    let newTodos = todos.map(todo => {
      if (todo.id !== id) return todo
      return { ...todo, completed: !todo.completed }
    })
    setTodos(newTodos)
  })

  useEffect('toggle-all', () => {
    let completed = !todos.every(todo => todo.completed)
    let newTodos = todos.filter(todo => ({ ...todo, completed }))
    setTodos(newTodos)
  })

  useEffect('clear-completed', () => {
    let newTodos = todos.filter(todo => !todo.completed)
    setTodos(newTodos)
  })

  return todos
}

const delay = (time = 1000) => {
  return new Promise(resolve => setTimeout(resolve, time))
}

const useCount = (initialCount = 0) => {
  let [getCount, setCount] = useGetSet(initialCount)

  useEffect(() => {
    let timer = setInterval(() => setCount(getCount() + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  return getCount()
}

const store = usable(() => {
  let count = useCount()
  let random = useRaise(
    resume => {
      let timer = setTimeout(() => resume(Math.random()), 3000)
      return () => clearTimeout(timer)
    },
    [Math.floor(count / 10)]
  )
  let asyncValue = useSuspense(
    async () => {
      await delay(1000)
      return Math.random()
    },
    [Math.floor(count / 3)]
  )
  let text = useText()
  let todos = useTodos()
  let size = useWindowSize()
  let activeCount = todos.filter(todo => !todo.completed).length
  let completedCount = todos.length - activeCount
  return {
    random,
    asyncValue,
    size,
    count,
    text,
    todos,
    activeCount,
    completedCount
  }
})

const unsubscribe = store.subscribe((state, action, payload) => {
  console.log('todo', state)
})

store.init()

// const timeStore = usable(() => useTime())

// timeStore.subscribe((state, action, payload) => {
//   console.log('time', { state, action, payload })
// })

// timeStore.init()

window.store = store
