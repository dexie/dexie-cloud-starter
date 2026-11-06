import Image from '@tiptap/extension-image'

// Old resize-image documents stored CSS in attrs.style. Keep that schema key
// (so Yjs does not delete it on unrelated edits), but never render arbitrary CSS.
// This deliberately supports only the old size and left/center/right alignment.
function legacyStyle(value: unknown): Map<string, string> {
  const safe = new Map<string, string>()
  if (typeof value !== 'string') return safe
  for (const declaration of value.split(';')) {
    const [rawName, rawValue, ...extra] = declaration.split(':')
    if (!rawValue || extra.length) continue
    const name = rawName.trim().toLowerCase()
    const css = rawValue
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/\b0px\b/g, '0')
    if (
      ((name === 'width' || name === 'height') &&
        /^(?:auto|(?:[0-9]{1,5}(?:\.[0-9]{1,3})?)(?:px|%))$/.test(css)) ||
      (name === 'margin' && /^(?:0|0 auto|0 0 0 auto|0 auto 0 0)$/.test(css)) ||
      ((name === 'margin-left' || name === 'margin-right') &&
        /^(?:0|auto)$/.test(css)) ||
      (name === 'display' && css === 'block')
    )
      safe.set(name, css)
  }
  return safe
}

function serializeStyle(style: Map<string, string>): string {
  return Array.from(style, ([name, value]) => name + ': ' + value + ';').join(
    ' ',
  )
}

export const LegacyImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
        parseHTML: (element: HTMLElement) =>
          serializeStyle(legacyStyle(element.getAttribute('style'))) || null,
        renderHTML: (attributes: Record<string, unknown>) => {
          const style = legacyStyle(attributes.style)
          // Native resizing owns dimensions once committed; old inline widths
          // must not override width/height attrs in previews or the NodeView.
          for (const name of style.size ? ['width', 'height'] : []) {
            const value = attributes[name]
            if (
              value !== null &&
              value !== undefined &&
              /^\d+(?:\.\d+)?$/.test(String(value))
            )
              style.set(name, String(value) + 'px')
          }
          const css = serializeStyle(style)
          return css ? { style: css } : {}
        },
      },
    }
  },
})
