'use client'

import { useEditor, EditorContent, Extensions, Editor } from '@tiptap/react'
import Placeholder from '@tiptap/extension-placeholder'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
import { CSSProperties, MutableRefObject, useEffect, useMemo } from 'react'
import { alpha } from '@mui/material'
import * as Y from 'yjs'
import { useObservable } from 'dexie-react-hooks'
import { db } from '@/app/db/db'
import { DexieYProvider } from 'dexie'
import { commonTiptapExtensions } from '@/app/lib/common-tiptap-extensions'
import { hexify, stringToColor } from '@/app/lib/color-handling'
import theme from '@/theme'
import { DexieImageUpload } from '@/app/lib/extensions/DexieImageUpload'

interface EditorProps {
  yDoc?: Y.Doc
  provider?: DexieYProvider<Y.Doc> | null
  cardId: string
  style?: CSSProperties
  setCanPost: (canPost: boolean) => void
  onPost?: () => void
  editorRef: MutableRefObject<Editor | null>
}

export default function Tiptap({
  yDoc,
  provider,
  cardId,
  style,
  setCanPost,
  onPost,
  editorRef,
}: EditorProps) {
  const currentUser = useObservable(db.cloud.currentUser)

  const extensions = useMemo<Extensions>(() => {
    const collaborationColor = hexify(
      alpha(stringToColor(currentUser?.userId || ''), 0.3),
      alpha(theme.palette.background.default, 1),
    )

    return [
      // Alla era övriga standard‐extensions:
      ...commonTiptapExtensions,

      // Placeholder‐extension:
      Placeholder.configure({ placeholder: 'Write something …' }),

      // Yjs Collaboration (delad doc):
      Collaboration.configure({ document: yDoc }),

      // Pluggar in drag‐&‐släpp samt klistra in Dexie‐bilder:
      DexieImageUpload.configure({
        cardId,
        getEditor: () => editorRef.current,
      }),

      // Om ni har realtidsmarkörer (cursors):
      ...(provider && currentUser?.isLoggedIn && currentUser?.name
        ? [
            CollaborationCursor.configure({
              provider,
              user: {
                name: currentUser.name.split(/[^a-zA-Z]+/)[0] || 'Anon',
                color: collaborationColor,
              },
            }),
          ]
        : []),
    ]
  }, [yDoc, provider, cardId, currentUser, editorRef])

  const editor = useEditor(
    {
      extensions,
      editorProps: {
        handleKeyDown(_, event) {
          // Existerande logik för t.ex. Ctrl+Enter:
          if (
            (event.metaKey || event.ctrlKey) &&
            event.key === 'Enter' &&
            onPost
          ) {
            onPost()
            editorRef.current?.commands.setContent('')
            event.preventDefault()
            return true
          }
          return false
        },
      },
      onUpdate() {
        if (editorRef.current) {
          setCanPost(!editorRef.current.isEmpty)
        }
      },
    },
    [extensions],
  )

  useEffect(() => {
    editorRef.current = editor
  }, [editor, editorRef])

  return <EditorContent editor={editor} style={style} />
}
