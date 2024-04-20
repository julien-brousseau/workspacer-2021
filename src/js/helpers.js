// Generate, attach and returns a DOM node
export const appendElement = (parent, { 
    tag = 'div', 
    classes = [], 
    text = '', 
    style = null,
    title = null, 
    src = null, 
    type = null, 
    id = null, 
    _for = null, 
    value = null, 
    name = null } = {}) => {

  const element = document.createElement(tag);
  element.classList.add(...classes.filter(c => c && c !== ''));

  if (id) element.id = id;
  if (src) element.src = src;
  if (type) element.type = type;
  if (value) element.value = value;
  if (name) element.name = name;
  if (text) element.innerHTML = text; 
  if (title)element.title = title;
  if (style) element.style = style;
  if (_for) element.setAttribute('for', _for);

  parent.appendChild(element);
  return element;
};


// Clears all listeners from html element by replacing the node in DOM
export const resetElement = (id) => {
  const node = document.getElementById(id);
  const clone = node.cloneNode(true);
  node.parentNode.replaceChild(clone, node);
};