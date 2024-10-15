"use client"

import { useEditor, EditorContent, Extensions } from "@tiptap/react"
import Placeholder from "@tiptap/extension-placeholder"
import StarterKit from "@tiptap/starter-kit"
import { CSSProperties, useEffect, useMemo, useRef } from "react"
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight"
import { common, createLowlight } from "lowlight"
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from "yjs"
import { useDocument, useObservable } from "dexie-react-hooks"
import { db } from "../db/db"
import { DexieYProvider } from "dexie"

interface EditorProps {
  yDoc?: Y.Doc
  provider?: DexieYProvider
  style?: CSSProperties
  setIsEdited: (edited: boolean) => void
  setCanPost: (canPost: boolean) => void
  setIsEditorEmpty: (isEmpty: boolean) => void
  getContent: (content: string) => void
  onPost: (content: string) => void // Ny funktion som triggas vid post
  setEditor: (editor: any) => void // Ny prop för att skicka ut editor-instansen
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
  setEditor, // Mottag setEditor-funktionen
}: EditorProps) => {
  const currentUser = useObservable(db.cloud.currentUser);
  const collaborationColor = useMemo(
    () => randomCollaborationColor(currentUser?.userId),
    [currentUser?.userId]
  );

  const extensions: Extensions = [
    StarterKit,
    CodeBlockLowlight.configure({
      lowlight: createLowlight(common),
      defaultLanguage: null,
    }),
    Placeholder.configure({
      placeholder: "Write something …",
    }),
    Collaboration.configure({
      document: yDoc,
    })
  ];
  if (provider) {
    extensions.push(
    CollaborationCursor.configure({
      provider,
      user: {
        name: currentUser?.name || 'Anonymous',
        color: collaborationColor,
      },
    }));
  }

  const editor = useEditor({
    extensions,
    editorProps: {
      handleKeyDown(view: any, event: any) {
        // Kolla om Cmd+Enter eller Ctrl+Enter har tryckts
        if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
          if (editor && !editor.isEmpty) {
            // Anropa onPost och skicka det aktuella innehållet
            onPost(editor.getHTML())
          }

          editor?.commands.setContent("")

          event.preventDefault() // Förhindra standardbeteendet
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
        const isModified = true;//currentContent !== initialContent.current

        setIsEdited(isModified)
        setCanPost(!isEditorEmpty && isModified)

        // Skicka innehållet till föräldrakomponenten
        getContent(currentContent)
      }
    },
  })

  useEffect(() => {
    if (editor) {
      if (setEditor) setEditor(editor)
    }
  }, [editor, setEditor])

  return <EditorContent editor={editor} style={style} />
}

export default Tiptap


function randomCollaborationColor(userId: string | undefined) {
  const colors = ['#FF5733', '#33FF57', '#3357FF', '#F333FF'];
  if (userId) {
    return colors[
      (userId.charCodeAt(0) +
        (userId.charCodeAt(3) || 0) +
        (userId.charCodeAt(5) || 0)) %
        colors.length
    ];
  }
  return colors[0];
}
