export const guard = callback => {
	let isStarted = false
	let isFinished = false
	return (type, payload) => {
		if (isFinished) return
		if (isStarted && type === START) return
		if (type === START) isStarted = true
		if (type === FINISH) isFinished = true
		callback(type, payload)
	}
}


export const log = name => source => (type, payload) => {

}
	map(x => {
		console.log(name, x)
		return x
	})
