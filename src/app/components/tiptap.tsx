'use client'

import { useEditor, EditorContent, Extensions, Editor } from '@tiptap/react'
import Placeholder from '@tiptap/extension-placeholder'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCaret from '@tiptap/extension-collaboration-caret'
import { CSSProperties, RefObject, useEffect, useMemo, useState } from 'react'
import * as Y from 'yjs'
import { useObservable } from 'dexie-react-hooks'
import { db } from '@/app/db/db'
import { DexieYProvider } from 'y-dexie'
import {
  editorTiptapExtensions,
  tiptapFragmentName,
} from '@/app/lib/common-tiptap-extensions'
import { stringToColor } from '@/app/lib/color-handling'

interface EditorProps {
  yDoc?: Y.Doc
  provider?: DexieYProvider | null
  style?: CSSProperties
  setCanPost: (canPost: boolean) => void
  onPost?: () => void
  editorRef: RefObject<Editor | null>
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
  const [incompatibleDoc, setIncompatibleDoc] = useState<Y.Doc | null>(null)
  // Cloud owns this Awareness. Local/unsynced providers need not have one.
  // Never construct or destroy a replacement Awareness in the editor.
  const awareness = provider?.awareness
  const name = currentUser?.isLoggedIn
    ? currentUser.name?.split(/[^a-zA-Z]+/)[0] || 'Anon'
    : 'Anon'
  const color = stringToColor(currentUser?.userId || '')

  const extensions = useMemo<Extensions>(
    () => [
      ...editorTiptapExtensions,
      Placeholder.configure({ placeholder: 'Write something …' }),
      ...(yDoc
        ? [
            Collaboration.configure({
              document: yDoc,
              field: tiptapFragmentName,
            }),
          ]
        : []),
      ...(yDoc && awareness
        ? [CollaborationCaret.configure({ provider: { awareness } })]
        : []),
    ],
    [yDoc, awareness],
  )

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions,
      editable: Boolean(yDoc) && incompatibleDoc !== yDoc,
      enableContentCheck: true,
      onContentError({ editor }) {
        // Do NOT call disableCollaboration: it destroys the shared Dexie Y.Doc.
        editor.setEditable(false)
        setIncompatibleDoc(yDoc ?? null)
        setCanPost(false)
      },
      editorProps: {
        handleKeyDown(view, event) {
          if (
            view.editable &&
            !event.isComposing &&
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
      onUpdate({ editor }) {
        setCanPost(editor.isEditable && !editor.isEmpty)
      },
    },
    [extensions],
  )

  useEffect(() => {
    if (!editor || editor.isDestroyed || !yDoc || !awareness) return
    // Profile/auth observable churn must not recreate the editor or its undo
    // manager. Caret requires an opaque six-digit hex color.
    editor.commands.updateUser({ name, color })
  }, [editor, yDoc, awareness, name, color])

  useEffect(() => {
    editorRef.current = editor
    setCanPost(Boolean(editor && editor.isEditable && !editor.isEmpty))
    return () => {
      if (editorRef.current === editor) editorRef.current = null
      // useEditor owns editor teardown. The caller owns the document lease.
    }
  }, [editor, editorRef, setCanPost])

  return (
    <>
      {yDoc && incompatibleDoc === yDoc && (
        <p role="alert">
          This document uses content this app cannot edit. Refresh to update the
          app before continuing.
        </p>
      )}
      <EditorContent editor={editor} style={style} />
    </>
  )
}
