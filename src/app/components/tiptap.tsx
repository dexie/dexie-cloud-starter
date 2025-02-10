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

interface EditorProps {
  yDoc?: Y.Doc
  provider?: DexieYProvider<Y.Doc> | null
  style?: CSSProperties
  setCanPost: (canPost: boolean) => void
  onPost?: () => void
  editorRef: MutableRefObject<Editor | null>
}

export default function Tiptap({
  yDoc,
  provider,
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
      ...commonTiptapExtensions,

      Placeholder.configure({ placeholder: 'Write something …' }),

      Collaboration.configure({ document: yDoc }),

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
  }, [yDoc, provider, currentUser])

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions,
      editorProps: {
        handleKeyDown(_, event) {
          if (
            (event.metaKey || event.ctrlKey) &&
            event.key === 'Enter' &&
            onPost
          ) {
            onPost()
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
