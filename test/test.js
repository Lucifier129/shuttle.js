import { START, NEXT, FINISH, ASYNC, ERROR } from '../src/constant'

test('check constant value', () => {
	expect(START).toBe(0)
	expect(NEXT).toBe(1)
	expect(FINISH).toBe(2)
	expect(ASYNC).toBe(3)
	expect(ERROR).toBe(4)
})
