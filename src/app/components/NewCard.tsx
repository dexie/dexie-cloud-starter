"use client"

import { use, useState } from "react"
import { v4 as uuid } from "uuid"
import { createCard, ICard } from "../db/db"
import dayjs from "dayjs"
import Tiptap from "@/app/components/Tiptap"
import theme from "@/theme"
import Button from "@mui/material/Button"
import { Typography, CardContent } from "@mui/material"
import { useSearch } from "../(pages)/SearchContext"
import { ContentCard, ContentWrapper } from "./ItemCard"
import * as Y from "yjs"

interface NewCardProps {
  spaceId?: string
}

const NewCard = ({ spaceId }: NewCardProps) => {
  const [isEdited, setIsEdited] = useState(false)
  const [canPost, setCanPost] = useState(false)
  const [isEditorEmpty, setIsEditorEmpty] = useState(true)
  const [editorContent, setEditorContent] = useState("")
  const [editor, setEditor] = useState<any>(null) // Ny state för editor-instansen
  const { searchKeyword, setSearchKeyword } = useSearch()
  const tempDoc = useState(() => new Y.Doc())[0]

  // Funktion som körs när Ctrl+Enter eller Cmd+Enter trycks
  const handlePost = (yDoc: Y.Doc) => {
    const card = {
      id: uuid(),
      type: "document",
      doc: yDoc,
      createdAt: dayjs().toISOString(),
      spaceId: spaceId,
    } as ICard

    createCard(card)
    setCanPost(false)
    setIsEdited(false)
    setIsEditorEmpty(true)
    setSearchKeyword("")

    if (editor) {
      editor.commands.setContent("") // Tömmer innehållet i editorn
    }

    setEditorContent("")
  }
  return (
    <div>
      <ContentCard
        sx={{
          position: "relative",
          pb: 4,
        }}
        isScaled={false}
      >
        <ContentWrapper scaleFactor={1}>
          <CardContent>
            <Typography
              variant="body2"
              sx={{
                color: theme.palette.primary.main,
                fontSize: "0.75rem",
                pb: 0.5,
              }}
            >
              ADD NEW NOTE
            </Typography>

            <Tiptap
              yDoc={tempDoc}
              setIsEdited={setIsEdited}
              setCanPost={setCanPost}
              setIsEditorEmpty={setIsEditorEmpty}
              getContent={setEditorContent}
              onPost={() => handlePost(tempDoc)} // Skicka in handlePost-funktionen
              setEditor={setEditor} // Skicka in setEditor
            />
            {canPost && (
              <Button
                variant="contained"
                color="primary"
                onClick={() => handlePost(tempDoc)}
                disabled={!canPost}
                sx={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  width: "100%",
                  borderRadius: 0,
                }}
              >
                PRESS CTRL+ENTER TO SAVE
              </Button>
            )}
          </CardContent>
        </ContentWrapper>
      </ContentCard>
    </div>
  )
}

export default NewCard
