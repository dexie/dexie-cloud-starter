'use client'

import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { addImageToCard } from '@/app/db/db'

interface DexieImageUploadOptions {
  cardId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getEditor: () => any
}

export const DexieImageUpload = Extension.create<DexieImageUploadOptions>({
  name: 'dexieImageUpload',

  addOptions() {
    return {
      cardId: '',
      getEditor: () => null,
    }
  },

  addProseMirrorPlugins() {
    const { cardId, getEditor } = this.options

    return [
      new Plugin({
        key: new PluginKey('dexieImageUpload'),
        props: {
          handleDrop(view: EditorView, event: DragEvent) {
            if (!event.dataTransfer?.files?.length) return false
            event.preventDefault()

            Array.from(event.dataTransfer.files).forEach(async (file) => {
              if (!file.type.startsWith('image/')) return
              const imageInDexie = await addImageToCard(cardId, file)
              if (!imageInDexie) return

              getEditor()
                ?.chain()
                .focus()
                .setImage({
                  src: `dexie://${imageInDexie.id}`,
                })
                .run()
            })
            return true
          },

          handlePaste(view: EditorView, event: ClipboardEvent) {
            if (!event.clipboardData?.files?.length) return false
            let handled = false

            Array.from(event.clipboardData.files).forEach(async (file) => {
              if (!file.type.startsWith('image/')) return
              handled = true
              event.preventDefault()

              const imageInDexie = await addImageToCard(cardId, file)
              if (!imageInDexie) return

              getEditor()
                ?.chain()
                .focus()
                .setImage({
                  src: `dexie://${imageInDexie.id}`,
                })
                .run()
            })
            return handled
          },
        },
      }),
    ]
  },
})
