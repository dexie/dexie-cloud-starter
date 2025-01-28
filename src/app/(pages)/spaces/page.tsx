'use client'

import {
  Box,
  CircularProgress,
  Chip,
  Button,
  Typography,
  alpha,
  TextField,
} from '@mui/material'
import { v4 as uuid } from 'uuid'
import BookmarksIcon from '@mui/icons-material/Bookmarks'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import { createSpace, useLiveDataSpaces } from '../../db/db'
import { useState } from 'react'
import WorkspacesIcon from '@mui/icons-material/Workspaces'
import dayjs from 'dayjs'
import ItemCard, { FIXED_HEIGHT } from '@/app/components/ItemCard'
import theme from '@/theme'
import Link from 'next/link'
import Avatars from '@/app/components/Avatars'
export default function Spaces() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newSpaceName, setNewSpaceName] = useState('')

  const spaces = useLiveDataSpaces()

  const handlePost = () => {
    createSpace({
      id: uuid(),
      title: newSpaceName,
      createdAt: dayjs().toISOString(),
    })
    setIsModalOpen(false)
  }

  if (!spaces) {
    return <CircularProgress />
  }

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant="h5">All spaces</Typography>
        <Chip
          icon={<WorkspacesIcon />}
          label="New space"
          sx={{
            padding: '20px 10px',
            backgroundColor: 'white !important',
            borderRadius: '8px',
          }}
          onClick={() => setIsModalOpen(true)}
        />
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '20px',
        }}
      >
        {spaces.map((space) => (
          <Link key={space.id} href={`/spaces/${space.id}`}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
                padding: '10px',
                borderRadius: '6px',
                position: 'relative',
              }}
            >
              <Box sx={{ position: 'absolute', right: 15, top: 15 }}>
                <Avatars realmId={space?.realmId as string} compact />
              </Box>
              <Box
                sx={{
                  minHeight: FIXED_HEIGHT,
                  height: FIXED_HEIGHT,
                  maxHeight: FIXED_HEIGHT,
                  backgroundColor: 'white',
                  borderRadius: '6px',
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {space.cards.length > 0 ? (
                  <ItemCard item={space.cards[0]} />
                ) : (
                  <BookmarksIcon
                    sx={{
                      fontSize: 100,
                      color: alpha(theme.palette.text.primary, 0.05),
                    }}
                  />
                )}
              </Box>
              <Typography variant="subtitle1">{space.title}</Typography>
            </Box>
          </Link>
        ))}
      </Box>
      <Dialog
        fullWidth={true}
        maxWidth="xs"
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      >
        <DialogContent
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '20px',
          }}
        >
          <Typography variant="h4">Create a new space</Typography>
          <Typography variant="body1">
            A space is a collection of cards inside your mind. Upload directly
            into a space, or pick a card from the overview.
          </Typography>
          <TextField
            fullWidth
            onChange={(e) => setNewSpaceName(e.target.value)}
            value={newSpaceName}
          ></TextField>
          <Button variant="contained" onClick={() => handlePost()}>
            Next step
          </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}
