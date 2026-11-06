import { Extension } from '@tiptap/core'
import { ySyncPluginKey } from '@tiptap/y-tiptap'
import { Fragment, Slice } from '@tiptap/pm/model'
import {
  Plugin,
  PluginKey,
  Selection,
  SelectionBookmark,
} from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'

function downscaleImage(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, 1024 / img.width, 1024 / img.height)
      if (scale === 1) return resolve(dataUrl)
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(img.width * scale))
      canvas.height = Math.max(1, Math.round(img.height * scale))
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('Could not create an image canvas'))
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      // Keep transparency for PNG/WebP rather than silently flattening to JPEG.
      const type = /^data:image\/(png|webp)[;,]/i.exec(dataUrl)?.[1]
      resolve(canvas.toDataURL(type ? 'image/' + type : 'image/jpeg', 0.6))
    }
    img.onerror = () => reject(new Error('Could not decode the image'))
    img.src = dataUrl
  })
}

type PendingUploads = Map<number, SelectionBookmark>
type UploadMeta =
  { add: { id: number; bookmark: SelectionBookmark } } | { remove: number }

export const Base64ImageUpload = Extension.create({
  name: 'base64ImageUpload',

  addProseMirrorPlugins() {
    const key = new PluginKey<PendingUploads>('base64ImageUpload')
    const readers = new Set<FileReader>()
    let destroyed = false
    let nextId = 0

    const readImage = (file: File): Promise<string> =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        readers.add(reader)
        reader.onload = () => {
          readers.delete(reader)
          if (typeof reader.result === 'string') resolve(reader.result)
          else reject(new Error('Could not read the image'))
        }
        reader.onerror = reader.onabort = () => {
          readers.delete(reader)
          reject(reader.error || new Error('Image reading was canceled'))
        }
        reader.readAsDataURL(file)
      }).then(downscaleImage)

    const upload = (
      view: EditorView,
      files: File[],
      bookmark: SelectionBookmark,
    ) => {
      const id = nextId++
      view.dispatch(
        view.state.tr.setMeta(key, {
          add: { id, bookmark },
        } satisfies UploadMeta),
      )
      // One ordered insertion, even if file reads finish out of order. Mapping
      // the bookmark through transactions keeps the original paste/drop target.
      void Promise.allSettled(files.map(readImage)).then((results) => {
        if (destroyed || view.isDestroyed) return
        const pending = key.getState(view.state)?.get(id)
        if (!pending) return
        const tr = view.state.tr.setMeta(key, {
          remove: id,
        } satisfies UploadMeta)
        const image = view.state.schema.nodes.image
        const nodes = results.flatMap((result) => {
          if (result.status === 'fulfilled')
            return [image.create({ src: result.value })]
          console.error('Image upload failed:', result.reason)
          return []
        })
        if (view.editable && nodes.length > 0) {
          tr.setSelection(pending.resolve(view.state.doc))
          tr.replaceSelection(
            new Slice(Fragment.fromArray(nodes), 0, 0),
          ).scrollIntoView()
        }
        view.dispatch(tr)
      })
    }

    const imageFiles = (transfer: DataTransfer): File[] => {
      const files = Array.from(transfer.files)
      const candidates = files.length
        ? files
        : Array.from(transfer.items || [])
            .filter((item) => item.kind === 'file')
            .map((item) => item.getAsFile())
            .filter((file): file is File => file !== null)
      // Leave ordinary text, HTML and mixed/non-image file transfers to the
      // normal editor/browser handlers instead of swallowing their events.
      if (
        transfer.getData('text/plain') ||
        transfer.getData('text/html') ||
        candidates.some((file) => !file.type.startsWith('image/'))
      )
        return []
      return candidates
    }

    return [
      new Plugin<PendingUploads>({
        key,
        state: {
          init: () => new Map(),
          apply(tr, previous) {
            const pending: PendingUploads = new Map()
            // Yjs replaces PM spans when projecting remote changes. Numeric
            // bookmarks in those spans cannot identify their logical target.
            // Cancel rather than insert at the wrong target; paste again after
            // the remote edit. Unrelated remote spans still map normally.
            const remoteReplace = tr.docChanged &&
              tr.getMeta(ySyncPluginKey)?.isChangeOrigin
            previous.forEach((bookmark, id) => {
              if (remoteReplace) {
                const target = bookmark.resolve(tr.before)
                let from = target.from
                let to = target.to
                for (const map of tr.mapping.maps) {
                  let replaced = false
                  map.forEach((start, end) => {
                    if (end > start && start <= to && end >= from)
                      replaced = true
                  })
                  if (replaced) return
                  from = map.map(from)
                  to = map.map(to)
                }
              }
              pending.set(id, bookmark.map(tr.mapping))
            })
            const meta = tr.getMeta(key) as UploadMeta | undefined
            if (meta && 'add' in meta)
              pending.set(meta.add.id, meta.add.bookmark)
            if (meta && 'remove' in meta) pending.delete(meta.remove)
            return pending
          },
        },
        view: () => {
          destroyed = false
          return {
            destroy() {
              destroyed = true
              readers.forEach((reader) => reader.abort())
              readers.clear()
            },
          }
        },
        props: {
          handleDOMEvents: {
            paste(view, event: ClipboardEvent) {
              if (
                !view.editable ||
                !view.state.schema.nodes.image ||
                !event.clipboardData
              )
                return false
              const files = imageFiles(event.clipboardData)
              if (!files.length) return false
              event.preventDefault()
              upload(view, files, view.state.selection.getBookmark())
              return true
            },
            drop(view, event: DragEvent) {
              if (
                !view.editable ||
                !view.state.schema.nodes.image ||
                !event.dataTransfer
              )
                return false
              const files = imageFiles(event.dataTransfer)
              if (!files.length) return false
              const position = view.posAtCoords({
                left: event.clientX,
                top: event.clientY,
              })
              const selection = position
                ? Selection.near(view.state.doc.resolve(position.pos))
                : view.state.selection
              event.preventDefault()
              upload(view, files, selection.getBookmark())
              return true
            },
          },
        },
      }),
    ]
  },
})
