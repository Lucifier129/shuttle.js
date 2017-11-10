/** @jsx h */
import pathToRegexp from 'path-to-regexp'

export default {
  Scheme,
  Renderer,
  StaticDOMRenderer,
  StaticHTMLRenderer,
}

class Scheme {
  constructor(type, props, children) {
    this.type = type;
    this.props = props;
    this.children = children;
  }
}

function h(type, props, ...children) {
  return new Scheme(type, props, flattenList(children));
}

function flattenList(list, flatList = []) {
  for (let i = 0; i < list.length; i++) {
    let item = list[i];

    if (Array.isArray(item)) {
      flattenList(item, flatList);
      continue;
    }

    let isScheme = item instanceof Scheme

    if (!isScheme) {
      item = new Scheme(null, null, item);
    }

    flatList.push(item);
  }

  return flatList;
}

function createRenderer(scheme, Renderer) {
  let renderer = new Renderer(scheme);

  if (Array.isArray(scheme.children)) {
    let children = [];
    for (let i = 0; i < scheme.children.length; i++) {
      let current = createRenderer(scheme.children[i], Renderer);
      let isFirst = i === 0;
      if (!isFirst) {
        let previous = children[i - 1];
        current.previous = previous;
        previous.next = current;
      }
      current.parent = renderer;
      current.index = children.length;
      children.push(current);
    }
    renderer.children = children;
  }

  return renderer;
}

class Renderer {
  constructor(scheme) {
    this.scheme = scheme;
    this.isText = !scheme.type;
    this.parent = null;
    this.previous = null;
    this.next = null;
    this.children = null;
    this.index = null;
  }
  renderText() {
    return this.text(this.scheme.children);
  }
  renderProp(key, value) {
    this.propStart();
    this.prop(key, value);
    this.propEnd();
  }
  renderProps() {
    let { props } = this.scheme;
    this.propsStart();
    for (let key in props) {
      this.renderProp(key, props[key]);
    }
    this.propsEnd();
  }
  renderChild(index) {
    this.childStart();
    this.child(this.children[index].render());
    this.childEnd();
  }
  renderChildren() {
    this.childrenStart();
    for (let i = 0; i < this.children.length; i++) {
      this.renderChild(i);
    }
    this.childrenEnd();
  }
  renderElement() {
    let type = this.scheme.type;
    this.start(type);
    this.renderProps();
    this.renderChildren();
    return this.end(type);
  }
  render() {
    if (!this.parent) {
      this.root();
    }
    if (this.isText) {
      return this.renderText();
    } else {
      return this.renderElement();
    }
  }
  root() {}
  text() {}
  start() {}
  propsStart() {}
  propStart() {}
  prop() {}
  propEnd() {}
  propsEnd() {}
  childrenStart() {}
  childStart() {}
  child() {}
  childEnd() {}
  childrenEnd() {}
  end() {}
  remove() {}
}


class Server {
  constructor(state) {
    this.routes = {}
    this.state = Object.assign({}, state)
  }
  on(name, fn) {
    if (!Array.isArray(this.routes[name])) {
      this.routes[name] = []
    }
    if (!this.routes[name].includes(fn)) {
      this.routes[name].push(fn)
    }
  }
  off(name, fn) {
    if (this.routes.hasOwnProperty(name)) {
      this.routes[name] = this.routes[name].filter(item => item !== fn)
    }
  }
  update(name, data) {
    if (typeof data === 'function') {
      this.state[name] = data(this.state[name])
    } else {
      this.state[name] = data
    }
    if (this.routes[name]) {
      this.routes[name].forEach(fn => fn(this.state, data))
    }
  }
  get(name) {
    return this.state[name]
  }
}

class Request {
  constructor(name) {
    this.server = server
    this.name = name
  }
  getValue() {
    return this.server.get(this.name)
  }
}

class Response {
  constructor(name) {
    this.server = server
    this.name = name
  }
  setValue(value) {
    return this.server.update(this.name, value)
  }
}

let server = new Server({ count: 0 })
let $ = name => new Request(name)
let $$ = (name, f) => new Response(name).setValue(f) 

class StaticDOMRenderer extends Renderer {
  constructor(scheme) {
    super(scheme);
    this.node = null;
    this.observer = {}
  }
  render() {
    if (this.node) {
      return this.node;
    }
    return super.render();
  }
  text(text) {
    console.log('text', text)
    if (text instanceof Request) {
      let request = text
      text = request.getValue()
      request.server.on(request.name, () => {
        this.node.textContent = request.getValue()
      })
    }
    this.node = document.createTextNode(text + '');
    return this.node;
  }
  start(type) {
    this.node = document.createElement(type);
  }
  prop(key, value) {

    if (value instanceof Request) {
      let request = value
      value = request.getValue()
      request.server.on(request.name, () => {
        this.prop(key, request.getValue())
      })
    }

    if (key === "style") {
      let style = value;
      for (let name in style) {
        this.node.style[name] =
          typeof style[name] === "number" ? style[name] + "px" : style[name];
      }
      return;
    }

    if (key in this.node) {
      this.node[key] = value;
    } else {
      this.node.setAttribute(key, value + "");
    }
  }
  child(child) {
    this.node.appendChild(child);
  }
  end() {
    return this.node;
  }
}

class StaticHTMLRenderer extends Renderer {
  constructor(scheme) {
    super(scheme);
    this.html = "";
  }
  render() {
    if (this.html) {
      return this.html;
    }
    return super.render();
  }
  text(text) {
    this.html = text;
    return this.html;
  }
  start(type) {
    this.html += `<` + this.scheme.type;
  }
  prop(key, value) {
    if (key === "style") {
      let style = value;
      let list = [];
      for (let name in style) {
        let styleName = name.replace(/([A-Z])/g, "-$1").toLowerCase();
        let item = `${styleName}: ${typeof style[name] === "number"
          ? style[name] + "px"
          : style[name]};`;
        list.push(item);
      }
      this.html += " " + `style="${list.join(" ")}"`;
      return;
    }

    this.html += " " + `${key}="${value}"`;
  }
  propsEnd() {
    this.html += ">";
  }
  child(child) {
    this.html += child;
  }
  end(type) {
    this.html += `</${type}>`;
    return this.html;
  }
}

let state = {
  list: Array.from({ length: 4 }).map((_, index) => ({
    title: `title-${index}`,
    description: `description-${index}`
  }))
};

function StaticApp({ list }) {
  return (
    <ul
      class="list"
      style={{ width: 300, height: 500, backgroundColor: "pink" }}
    >
      {list.map((item, index) => {
        return (
          <li
            class="item"
            data-index={index}
            style={{
              width: "50%",
              height: 100,
              marginBottom: 10,
              marginLeft: 10,
              backgroundColor: "rgb(234, 234, 234)"
            }}
          >
            <h2 class="title" style={{ height: 60, color: "red" }}>
              {item.title}
            </h2>
            <p class="description" style={{ height: 40, color: "green" }}>
              {item.description}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

function CountApp() {
  return (
    <div>
      <h1 data-count={$('count')}>Count: {$('count')}|{$('count')}|{$('count')}|{$('count')}</h1>
      <button onclick={() => $$('count', count => count + 1)}>+1</button>
      <button onclick={() => $$('count', count => count - 1)}>-1</button>
    </div>
  )
}

let appScheme = CountApp(state);

let htmlRenderer = createRenderer(appScheme, StaticHTMLRenderer);
let domRenderer = createRenderer(appScheme, StaticDOMRenderer);

console.time("render to static html");
let html = htmlRenderer.render();
console.timeEnd("render to static html");

console.time("render to static dom");
let dom = domRenderer.render();
console.timeEnd("render to static dom");

console.log("isEqual", dom.outerHTML === html);
console.log(dom.outerHTML);
console.log(html);
console.log({ appScheme, htmlRenderer, domRenderer });

document.body.innerHTML = "";
document.body.appendChild(dom);
