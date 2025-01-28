'use client'

import {
  AppBar,
  Toolbar,
  Typography,
  TextField,
  Container,
  Box,
} from '@mui/material'
import theme from '@/theme'
import Divider from '@mui/material/Box'
import { useObservable } from 'dexie-react-hooks'
import { useRouter } from 'next/navigation'
import HistoryIcon from '@mui/icons-material/History'
import { ReactNode } from 'react'
import { db } from '../db/db'
import React from 'react'
import { SearchProvider, useSearch } from './SearchContext'
import { NavItem } from '../components/NavItem'
import { deleteUserAccount } from '../lib/delete-account'
import PersonRemoveIcon from '@mui/icons-material/PersonRemove'
import LogoutIcon from '@mui/icons-material/Logout'
import { InviteAlert } from '../components/InviteAlert'
import UserInteractionWrapper from '../components/UserInteractionWrapper'

export default function Template({ children }: { children: ReactNode }) {
  const router = useRouter()

  const dexieCloudUser = useObservable(db?.cloud?.currentUser) || {
    userId: 'unauthorized',
    email: '',
  }

  return (
    <UserInteractionWrapper>
      <SearchProvider>
        <Container
          maxWidth={false}
          disableGutters
          sx={{
            minHeight: '100vh',
          }}
        >
          <AppBar position="static" color="transparent" elevation={0}>
            <Toolbar
              sx={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'flex-start',
                padding: '0 16px',
              }}
            >
              <SearchField />
              <Box
                sx={{
                  mx: 2,
                  borderTop: `solid 6px transparent`,
                  pt: 1,
                  color: theme.palette.primary.main,
                  cursor: 'pointer',
                }}
                onClick={() => {
                  router.push('/invites')
                }}
              >
                <InviteAlert />
              </Box>
              <NavItem name="Everything" href="/everything" />
              <NavItem name="Spaces" href="/spaces" />

              <Typography
                title="Reset all stored data"
                variant="body1"
                sx={{
                  mx: 2,
                  borderTop: `solid 4px transparent`,
                  pt: 1,
                  cursor: 'pointer',
                  color: theme.palette.primary.main,
                }}
                onClick={() => {
                  if (confirm('Reset all stored data?')) {
                    db.card.clear()
                  }
                }}
              >
                <HistoryIcon />
              </Typography>

              <Typography
                title="Delete account"
                variant="body1"
                sx={{
                  mx: 2,
                  borderTop: `solid 4px transparent`,
                  pt: 1,
                  cursor: 'pointer',
                  color: theme.palette.primary.main,
                }}
                onClick={() => {
                  deleteUserAccount(dexieCloudUser, router)
                }}
              >
                <PersonRemoveIcon />
              </Typography>
              <Typography
                title="Logout and remove local database"
                variant="body1"
                sx={{
                  mx: 2,
                  borderTop: `solid 4px transparent`,
                  pt: 1,
                  color: theme.palette.primary.main,
                }}
                onClick={() => {
                  if (confirm('Logout and remove local database?')) {
                    router.push('/logout')
                  }
                }}
              >
                <LogoutIcon />
              </Typography>
            </Toolbar>
          </AppBar>
          <Box sx={{ p: 2, pt: 0, mt: 0 }}>
            <Divider
              sx={{
                mb: 2,
                width: '100%',
                border: `solid 1px ${theme.palette.divider}`,
              }}
            />
            {children}
          </Box>
        </Container>
      </SearchProvider>
    </UserInteractionWrapper>
  )
}

function SearchField() {
  const { searchKeyword, setSearchKeyword } = useSearch()

  return (
    <TextField
      fullWidth
      variant="outlined"
      placeholder="Search my brain..."
      value={searchKeyword}
      onChange={(e) => setSearchKeyword(e.target.value)}
      InputProps={{
        style: {
          font: '400 70px / 84px var(--font-caveat)',
          fontStyle: 'italic',
        },
      }}
      sx={{
        flexGrow: 1,
        fontStyle: 'italic',
        color: 'text.secondary',
        '& .MuiOutlinedInput-root': {
          '& fieldset': {
            border: 'none',
          },
          '&:hover fieldset': {
            border: 'none',
          },
          '&.Mui-focused fieldset': {
            border: 'none',
          },
        },
      }}
    />
  )
}
