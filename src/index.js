/** @jsx h */

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

    if (!(item instanceof Scheme)) {
      item = new Scheme(null, null, item + "");
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
      if (i !== 0) {
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
    if (this.isText) {
      return this.renderText();
    } else {
      return this.renderElement();
    }
  }
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
  prop(key, value) {
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

class StaticCanvasRenderer extends Renderer {
  constructor(scheme) {
    super(scheme);
    this.canvas = null;
    this.ctx = null;
    this.style = scheme.props ? scheme.props.style : null;
    this.layout = null;
  }
  createCanvas() {
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");
    Object.assign(this.canvas, this.style);
  }
  getContext() {
    if (this.ctx) {
      return this.ctx;
    }
    return this.parent.getContext();
  }
  getLayout() {
    let { parent, previous } = this;

    if (this.layout) {
      return this.layout;
    }

    if (!parent) {
      this.layout = {
        x: 0,
        y: 0,
        ...this.style
      };
      return this.layout;
    }

    if (!previous) {
      let parentLayout = parent.getLayout();
      this.layout = {
        x: parentLayout.x,
        y: parentLayout.y,
        width: parentLayout.width,
        ...this.style
      };

      if (typeof this.layout.width === "string") {
        let width =
          parentLayout.width * Number(this.layout.width.replace("%", "")) / 100;
        this.layout.width = width;
      }

      if (this.style && this.style.marginLeft) {
        this.layout.x += this.style.marginLeft;
      }

      return this.layout;
    }

    if (previous) {
      let parentLayout = parent.getLayout();
      let previousLayout = previous.getLayout();
      this.layout = {
        x: parentLayout.x,
        y:
          previousLayout.y +
          previousLayout.height +
          (previousLayout.marginBottom || 0),
        ...this.style
      };

      if (typeof this.layout.width === "string") {
        let width =
          parentLayout.width * Number(this.layout.width.replace("%", "")) / 100;
        this.layout.width = width;
      }

      if (this.style && this.style.marginLeft) {
        this.layout.x += this.style.marginLeft;
      }
      return this.layout;
    }
  }

  drawLayout() {
    let ctx = this.getContext();
    let { x, y, width, height, backgroundColor } = this.getLayout();
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(x, y, width, height);
  }

  text(text) {
    let ctx = this.getContext();
    let { x, y, width, height, color } = this.parent.getLayout();
    let fontFamily =
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"';
    let lineHeight = this.parent.scheme.type === "h2" ? 24 : 12;
    ctx.fillStyle = color;
    ctx.font = `${lineHeight}px ${fontFamily}`;
    ctx.fillText(text, x, y + lineHeight, width);
  }
  start() {
    if (!this.parent) {
      this.createCanvas();
    }
    this.drawLayout();
  }
  end() {
    return this.canvas;
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

let appScheme = StaticApp(state);

let htmlRenderer = createRenderer(appScheme, StaticHTMLRenderer);
let domRenderer = createRenderer(appScheme, StaticDOMRenderer);
let canvasRenderer = createRenderer(appScheme, StaticCanvasRenderer);

console.time("render to static html");
let html = htmlRenderer.render();
console.timeEnd("render to static html");

console.time("render to static dom");
let dom = domRenderer.render();
console.timeEnd("render to static dom");

console.time("render to static canvas");
let canvas = canvasRenderer.render();
console.timeEnd("render to static canvas");

console.log("isEqual", dom.outerHTML === html);
console.log(dom.outerHTML);
console.log(html);
console.log({ appScheme, htmlRenderer, domRenderer });

let htmlContainer = document.createElement("div");
let root = document.createElement("div");
htmlContainer.innerText = html;
root.appendChild(dom);
root.appendChild(htmlContainer);
root.appendChild(canvas);
document.body.innerHTML = "";
document.body.appendChild(root);
