/** Tiny hyperscript helper. */
export const h = (tag, props = {}, ...children) => {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(props ?? {})) {
    if (key.startsWith('on') && typeof value === 'function') {
      element.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'class') {
      element.className = value;
    } else if (key === 'dataset') {
      Object.assign(element.dataset, value);
    } else if (key === 'html') {
      element.innerHTML = value;
    } else if (value === true) {
      element.setAttribute(key, '');
    } else if (value !== false && value != null) {
      element.setAttribute(key, String(value));
    }
  }
  element.append(...children.flat(Infinity).filter((child) => child != null && child !== false));
  return element;
};
