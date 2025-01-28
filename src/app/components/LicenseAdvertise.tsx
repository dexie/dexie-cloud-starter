'use client'

import { useObservable } from 'dexie-react-hooks'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Alert, AlertTitle, Snackbar } from '@mui/material'
import { db } from '../db/db'

const LicenseAdvertise = () => {
  const searchParams = useSearchParams()
  const setting = searchParams.get('setting')
  const currentUser = useObservable(db.cloud.currentUser)
  const [snackbarOpen, setSnackbarOpen] = useState(true)

  // Doing a sync after the snackbar state changes to fetch updates to the license
  // when offline the sync is turned of and a db.cloud.sync() will not be triggered
  // therefore we need to do a sync manually to get the latest license status
  useEffect(() => {
    if (snackbarOpen) {
      const syncTimer = setTimeout(() => {
        db.cloud.sync().catch((error) => {
          console.error('Sync failed:', error)
        })
      }, 1000)

      return () => clearTimeout(syncTimer)
    }
  }, [snackbarOpen])

  if (!currentUser) return null
  const { license } = currentUser
  if (!license) return null

  if (
    license.status === 'ok' &&
    license.validUntil === undefined &&
    license.evalDaysLeft === undefined
  ) {
    return null
  }

  if (setting === 'account') {
    return null
  }

  let licenseExpiresInDays = license.evalDaysLeft
  if (licenseExpiresInDays === undefined) {
    const validUntil = license.validUntil?.getTime() ?? Infinity
    licenseExpiresInDays = Math.round(
      (validUntil! - Date.now()) / (24 * 60 * 60 * 1000),
    )
  }

  if (license.status !== 'ok') {
    return (
      <Snackbar
        open={snackbarOpen}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity="error"
          sx={{
            width: '100%',
            '& .MuiAlert-icon': {
              alignItems: 'center',
              fontSize: '2.5rem',
            },
          }}
        >
          <AlertTitle>
            No valid license. You are in offline mode until a valid license is
            purchased.
          </AlertTitle>
          Your license has expired. Sync and backup features are currently
          unavailable. Reactivate your full access for just $0.XX a month. Click
          here to resolve now!
        </Alert>
      </Snackbar>
    )
  }

  if (licenseExpiresInDays < 7 && license.status === 'ok') {
    return (
      <Snackbar
        open={snackbarOpen}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity="warning"
          sx={{
            width: '100%',
            '& .MuiAlert-icon': {
              alignItems: 'center',
              fontSize: '2.5rem',
            },
          }}
        >
          <AlertTitle>
            License expires in {licenseExpiresInDays} days.
          </AlertTitle>
          Your current license expires in {licenseExpiresInDays} days. To
          continue syncing and backing up data features, please renew now. Avoid
          any disruption for only $X.XX a month. Click here to resolve now!
        </Alert>
      </Snackbar>
    )
  }

  return null
}

export default LicenseAdvertise
