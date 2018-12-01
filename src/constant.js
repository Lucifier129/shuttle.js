const symbol = typeof Symbol === 'function' ? Symbol : x => x

const NEXT = symbol('@sukkula/next')
const ERROR = symbol('@sukkula/error')
const CATCH = symbol('@sukkula/catch')
const SUSPENSE = symbol('@sukkula/suspense')
const EFFECT = symbol('@sukkula/effect')

module.exports = {
  NEXT,
  ERROR,
  CATCH,
  SUSPENSE,
  EFFECT
}
