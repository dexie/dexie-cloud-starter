"use client"

import { useEditor, EditorContent, Extensions, Editor } from "@tiptap/react"
import { alpha } from "@mui/material"
import Placeholder from "@tiptap/extension-placeholder"
import { CSSProperties, MutableRefObject, RefObject, useEffect, useMemo } from "react"
import Collaboration from "@tiptap/extension-collaboration"
import CollaborationCursor from "@tiptap/extension-collaboration-cursor"
import * as Y from "yjs"
import { useObservable } from "dexie-react-hooks"
import { db } from "../db/db"
import { DexieYProvider } from "dexie"
import { commonTiptapExtensions } from "../lib/common-tiptap-extensions"
import theme from "@/theme"
import { hexify, stringToColor } from "../lib/color-handling"

interface EditorProps {
  yDoc?: Y.Doc
  provider?: DexieYProvider<Y.Doc> | null
  style?: CSSProperties
  setIsEdited: (edited: boolean) => void
  setCanPost: (canPost: boolean) => void
  setIsEditorEmpty: (isEmpty: boolean) => void
  getContent: (content: string) => void
  onPost?: () => void
  editorRef: MutableRefObject<Editor | null>
}

const Tiptap = ({
  yDoc,
  provider,
  style,
  setIsEdited,
  setCanPost,
  setIsEditorEmpty,
  getContent,
  onPost,
  editorRef
}: EditorProps) => {
  const currentUser = useObservable(db.cloud.currentUser);

  const extensions = useMemo(() => {
    const collaborationColor = hexify(
      alpha(stringToColor(currentUser?.userId || ""), 0.3),
      alpha(theme.palette.background.default, 1)
    );
    const extensions: Extensions = [
      ...commonTiptapExtensions,
      Placeholder.configure({
        placeholder: "Write something …",
      }),
      Collaboration.configure({
        document: yDoc,
      }),
    ]

    if (provider && currentUser?.isLoggedIn && currentUser?.name) {
      extensions.push(
        CollaborationCursor.configure({
          provider,
          user: {
            name: currentUser.name.split(/[^a-zA-Z]+/)[0] || "",
            color: collaborationColor,
          },
        })
      )
    }
    return extensions;
  }, [yDoc, provider, currentUser])

  const editor = useEditor({
    extensions,
    editorProps: {
      handleKeyDown(view, event) {
        // CTRL+ENTER
        if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && onPost) {
          onPost()
          editorRef.current?.commands.setContent("")
          event.preventDefault()
          return true
        }
        return false
      },
    },
    onUpdate() {
      if (editor) {
        const isEditorEmpty = editor.isEmpty
        setIsEditorEmpty(isEditorEmpty)

        // Jämför nuvarande innehåll med initialContent
        const currentContent = editor.getHTML()
        const isModified = true //currentContent !== initialContent.current

        setIsEdited(isModified)
        setCanPost(!isEditorEmpty && isModified)

        // Skicka innehållet till föräldrakomponenten
        getContent(currentContent)
      }
    },
  }, [extensions])

  useEffect(() => {
    editorRef.current = editor;
  }, [editor, editorRef])

  return <EditorContent editor={editor} style={style} />
}

export default Tiptap
