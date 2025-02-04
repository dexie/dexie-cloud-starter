import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from 'prosemirror-state'

function downscaleImage(
  dataUrl: string,
  maxWidth: number,
  maxHeight: number,
  quality: number = 0.8,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let width = img.width
      let height = img.height

      if (width <= maxWidth && height <= maxHeight) {
        return resolve(dataUrl)
      }

      const aspectRatio = width / height
      if (width > height) {
        width = maxWidth
        height = Math.round(maxWidth / aspectRatio)
        if (height > maxHeight) {
          height = maxHeight
          width = Math.round(maxHeight * aspectRatio)
        }
      } else {
        height = maxHeight
        width = Math.round(maxHeight * aspectRatio)
        if (width > maxWidth) {
          width = maxWidth
          height = Math.round(maxWidth / aspectRatio)
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        return reject(new Error('Kunde inte skapa canvas context'))
      }
      ctx.drawImage(img, 0, 0, width, height)

      const resizedDataUrl = canvas.toDataURL('image/jpeg', quality)
      resolve(resizedDataUrl)
    }
    img.onerror = (e) => reject(e)
    img.src = dataUrl
  })
}

export const Base64ImageUpload = Extension.create({
  name: 'base64ImageUpload',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('base64ImageUpload'),
        props: {
          handleDOMEvents: {
            drop: (view, event: DragEvent) => {
              const files = event.dataTransfer?.files
              if (!files || files.length === 0) return false

              event.preventDefault()
              const maxWidth = 1024
              const maxHeight = 1024
              const quality = 0.6

              for (let i = 0; i < files.length; i++) {
                const file = files[i]
                if (file.type.startsWith('image/')) {
                  const reader = new FileReader()
                  reader.onload = (readerEvent) => {
                    const result = readerEvent.target?.result
                    if (typeof result === 'string') {
                      downscaleImage(result, maxWidth, maxHeight, quality)
                        .then((resizedResult) => {
                          const { state, dispatch } = view
                          const node = state.schema.nodes.image.create({
                            src: resizedResult,
                          })
                          const transaction =
                            state.tr.replaceSelectionWith(node)
                          dispatch(transaction)
                        })
                        .catch((error) => {
                          console.error('Nedskalning misslyckades:', error)
                        })
                    }
                  }
                  reader.readAsDataURL(file)
                }
              }
              return true
            },
          },
        },
      }),
    ]
  },
})
