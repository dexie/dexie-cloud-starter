export const hexify = (color: string, background: string) => {
  const [bg_r, bg_g, bg_b] = background
    .replace('rgba(', '')
    .replace(')', '')
    .split(',')
    .map((x) => parseInt(x))

  const values = color
    .replace(/rgba?\(/, '')
    .replace(/\)/, '')
    .replace(/[\s+]/g, '')
    .split(',')
  const a = parseFloat(values[3] || '1'),
    r = Math.floor(a * parseInt(values[0]) + (1 - a) * bg_r),
    g = Math.floor(a * parseInt(values[1]) + (1 - a) * bg_g),
    b = Math.floor(a * parseInt(values[2]) + (1 - a) * bg_b)

  return (
    '#' +
    ('0' + r.toString(16)).slice(-2) +
    ('0' + g.toString(16)).slice(-2) +
    ('0' + b.toString(16)).slice(-2)
  )
}

export const rgbaToDataUri = (color: string) => {
  if (typeof document === 'undefined') return
  const canvas = (document as Document).createElement(
    'canvas',
  ) as HTMLCanvasElement
  if (!canvas) return

  canvas.width = 900
  canvas.height = 70

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.fillStyle = color
  ctx.fillRect(0, 0, 1000, 50)

  const canvasData = canvas.toDataURL()
  canvas.remove()

  return canvasData
}

export const stringToColor = (text: string) => {
  if (text == undefined) return '#000000'
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash)
  }
  let colour = '#'
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff
    colour += ('00' + value.toString(16)).slice(-2)
  }
  return colour
}

export const invertColor = (hex: string) => {
  if (hex.indexOf('#') === 0) {
    hex = hex.slice(1)
  }
  // convert 3-digit hex to 6-digits.
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
  }
  if (hex.length !== 6) {
    throw new Error('Invalid HEX color.')
  }
  const r = parseInt(hex.slice(0, 2), 16),
    g = parseInt(hex.slice(2, 4), 16),
    b = parseInt(hex.slice(4, 6), 16)

  return r * 0.299 + g * 0.587 + b * 0.114 > 186 ? '#000000' : '#FFFFFF'
}
