'use client'

import { useObservable } from 'dexie-react-hooks'
import { ReactNode, useEffect, useState } from 'react'
import { db } from '../db/db'
import SignIn from '../signin'
import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'

export default function UserInteractionWrapper({
  children,
}: {
  children: ReactNode
}) {
  const userInteraction = useObservable(db.cloud.userInteraction)
  const [isDbOpen, setIsDbOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    db.open()
      .then(() => setIsDbOpen(true))
      .catch((e) => setError(e.message))
  }, [])

  switch (true) {
    case userInteraction != null:
      // Dexie Cloud wants to interact with the user before proceeding.
      return <SignIn {...userInteraction} />

    case error != null:
      // Could not open database for some reason. Show error message instead of just an eternal spinner.
      return <div>{'' + error}</div>

    case !isDbOpen:
      // Database is still being opened. Show a spinner.
      return (
        <Box sx={{ width: '100%' }}>
          <LinearProgress />
        </Box>
      )

    default:
      // Database is open and everything is ready for the app to render
      return <>{children}</>
  }
}
