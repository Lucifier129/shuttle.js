const { usable, useGetSet, useEffect, usePostEffect } = require('./index')

let instance = usable(() => {
	let [getCount, setCount] = useGetSet(10)
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

instance.run()
