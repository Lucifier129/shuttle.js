/** @jsx h */
import { create } from './source'
import { map, fromShape, consume } from './operator'
import React from 'react'
import ReactDOM from 'react-dom'

export function h(type, props, ...children) {
	return fromShape({ type, props, children }) |> map(React.createElement)
}

export function render(vdom$, container) {
	return vdom$ |> run(vdom => ReactDOM.render(vdom, container))
}
