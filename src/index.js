/** @jsx h */
// import pathToRegexp from "path-to-regexp";

// export default {
//   Scheme,
//   Renderer,
//   StaticDOMRenderer,
//   StaticHTMLRenderer
// };

class Scheme {}

class ElementScheme extends Scheme {
  constructor(type, props, children) {
    super();
    this.type = type;
    this.props = props;
    this.children = children;
  }
}

class TextScheme extends Scheme {
  constructor(text) {
    super();
    this.text = text;
  }
}

function isScheme(obj) {
  return obj instanceof Scheme;
}

function isElementScheme(obj) {
  return obj instanceof ElementScheme;
}

function isTextScheme(obj) {
  return obj instanceof TextScheme;
}

function h(type, props, ...children) {
  if (typeof type === "function") {
    return type({ ...props, children: flattenList(children) });
  }
  return new ElementScheme(type, props, flattenList(children));
}

function flattenList(list, flatList = []) {
  for (let i = 0; i < list.length; i++) {
    let item = list[i];

    if (Array.isArray(item)) {
      flattenList(item, flatList);
      continue;
    }

    if (!isScheme(item)) {
      item = new TextScheme(item + "");
    }

    flatList.push(item);
  }

  return flatList;
}

function createRenderer(scheme, Renderer, context = {}) {
  let renderer = new Renderer(scheme, context);

  if (isElementScheme(scheme)) {
    let children = [];
    for (let i = 0; i < scheme.children.length; i++) {
      let current = createRenderer(scheme.children[i], Renderer, context);
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
  constructor(scheme, context) {
    this.scheme = scheme;
    this.context = context;
    this.parent = null;
    this.previous = null;
    this.next = null;
    this.children = null;
  }
  isText() {
    return isTextScheme(this.scheme);
  }
  isElement() {
    return isElementScheme(this.scheme);
  }
  isRoot() {
    return !this.parent;
  }
  isFirst() {
    return !this.previous;
  }
  isLast() {
    return !this.next;
  }
  hasNode() {
    return !!this.node;
  }
  getRoot() {
    let root = this;
    while (!root.isRoot()) {
      root = root.parent;
    }
    return root;
  }
  renderText() {
    return this.text(this.scheme.text);
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
    if (this.isRoot()) {
      this.root();
    }
    if (this.isText()) {
      return this.renderText();
    } else if (this.isElement()) {
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

class StaticDOMRenderer extends Renderer {
  constructor(scheme) {
    super(scheme);
    this.node = null;
  }
  render() {
    if (this.node) {
      return this.node;
    }
    return super.render();
  }
  text(text) {
    this.node = document.createTextNode(text);
    return this.node;
  }
  start(type) {
    this.node = document.createElement(type);
  }
  style(style) {
    for (let styleName in style) {
      let styleValue = style[styleName];
      if (typeof style[styleName] === "number") {
        styleValue += "px";
      }
      if (styleValue != null && typeof styleValue !== "boolean") {
        this.node.style[styleName] = styleValue;
      }
    }
  }
  prop(key, value) {
    if (key === "style" && typeof value === "object") {
      this.style(value);
    } else if (key in this.node) {
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
  style(style) {
    let list = [];
    for (let name in style) {
      let styleName = name.replace(/([A-Z])/g, "-$1").toLowerCase();
      let styleValue = style[name];

      if (typeof style[name] === "number") {
        styleValue += "px";
      }

      if (styleValue != null && typeof styleValue !== "boolean") {
        list.push(`${styleName}: ${styleValue};`);
      }
    }
    this.prop("style", list.join(" "));
  }
  prop(key, value) {
    if (key === "style" && typeof value === "object") {
      this.style(value);
    } else {
      this.html += " " + `${key}="${value}"`;
    }
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
      style="width: 300px; height: 500px; background-color: pink;"
    >
      {list.map((item, index) => {
        return (
          <Item index={index}>
            <Title>{item.title}</Title>
            <Description>{item.description}</Description>
          </Item>
        );
      })}
    </ul>
  );
}

function Item({ index, children }) {
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
      {children}
    </li>
  );
}

function Title({ children }) {
  return (
    <h2 class="title" style={{ height: 60, color: "red" }}>
      {children}
    </h2>
  );
}

function Description({ children }) {
  return (
    <p class="description" style={{ height: 40, color: "green" }}>
      {children}
    </p>
  );
}

function CountApp() {
  return (
    <div>
      <h1 data-count={connect(state => state.count)}>
        Count: {$("count")}|{$("count")}|{$("count")}|{$("count")}
      </h1>
      <button onclick={() => $$("count", count => count + 1)}>+1</button>
      <button onclick={() => $$("count", count => count - 1)}>-1</button>
    </div>
  );
}

let appScheme = StaticApp(state);

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
