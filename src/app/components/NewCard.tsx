'use client'

import { useRef, useState } from 'react'
import { v4 as uuid } from 'uuid'
import { createCard, ICard } from '../db/db'
import dayjs from 'dayjs'
import Tiptap from '@/app/components/tiptap'
import theme from '@/theme'
import Button from '@mui/material/Button'
import { Typography, CardContent } from '@mui/material'
import { useSearch } from '../(pages)/SearchContext'
import { ContentCard, ContentWrapper } from './ItemCard'
import * as Y from 'yjs'
import { Editor } from '@tiptap/react'

interface NewCardProps {
  spaceId?: string
}

const NewCard = ({ spaceId }: NewCardProps) => {
  const [canPost, setCanPost] = useState(false)

  const { setSearchKeyword } = useSearch()
  const [tempDoc, setTempDoc] = useState(() => new Y.Doc())
  const editorRef = useRef<Editor | null>(null)

  const handlePost = async (yDoc: Y.Doc) => {
    // Reset the state and clear content by assigning a new empty doc
    setTempDoc(new Y.Doc())
    setCanPost(false)
    setSearchKeyword('')

    // Persist the new card
    const card = {
      id: uuid(),
      doc: yDoc,
      createdAt: dayjs().toISOString(),
      spaceId: spaceId,
    } as ICard

    await createCard(card)

    // Give the editor focus again:
    editorRef.current?.view?.focus()
  }
  return (
    <div>
      <ContentCard
        sx={{
          position: 'relative',
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
                fontSize: '0.75rem',
                pb: 0.5,
              }}
            >
              ADD NEW NOTE
            </Typography>

            <Tiptap
              yDoc={tempDoc}
              setCanPost={setCanPost}
              onPost={() => handlePost(tempDoc)}
              editorRef={editorRef}
            />
            {canPost && (
              <Button
                variant="contained"
                color="primary"
                onClick={() => handlePost(tempDoc)}
                disabled={!canPost}
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: '100%',
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
