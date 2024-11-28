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
  // Observe dexie cloud requests for user interaction
  const userInteraction = useObservable(db.cloud.userInteraction)

  // Open the database to start both IndexedDB and Dexie Cloud interactions
  const [isDbOpen, setIsDbOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    db.open()
      .then(() => setIsDbOpen(true))
      .catch((e) => setError(e.message))
  }, [])

  if (userInteraction != null) {
    // Dexie Cloud wants to interact with the user before proceeding.
    // This might happen before the database is open if this is the very first launch of the application
    // or if user has been logged out.
    // It might also happen if the system needs to re-authenticate the user or prompt the user for any reason.
    // When requireAuth is configured, this will be a step in the open procedure
    return <SignIn {...userInteraction} />
  }

  if (error != null) {
    // Could not open database for some reason. Show error message instead of just an eternal spinner.
    // This could also happen if an error occurs in the authentication process as well as in the database open process.
    return <div>{'' + error}</div>
  }

  if (!isDbOpen) {
    // Currently no user interaction at the moment but still, the database open procedure is not yet finished.
    // Show a linear progres at the top of the screen to indicate that the app is loading.
    return (
      <Box sx={{ width: '100%' }}>
        <LinearProgress />
      </Box>
    )
  }

  // At this point, we're good to go and render the application.
  return <>{children}</>
}
