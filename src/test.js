const { usable, useGetSet, useEffect, usePostEffect } = require('./index')

let instance = usable(context => {
	let [getCount, setCount] = useGetSet(10)
	console.log('context', context)
	usePostEffect(() => {
		console.log('effect')
		let timer = setInterval(() => setCount(getCount() + 1), 1000)
		return () => {
			console.log('clear')
			clearInterval(timer)
		}
	}, [])

	return getCount()
})

instance.subscribe(state => {
	console.log('state', state)
	if (state === 20) instance.unsubscribe()
})

instance.run(123)

setTimeout(() => {
	instance.run(456)
}, 2000)
