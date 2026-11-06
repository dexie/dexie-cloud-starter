'use client'

import { useObservable } from 'dexie-react-hooks'
import { Badge } from '@mui/material'
import NotificationsIcon from '@mui/icons-material/Notifications'
import { db } from '../db/db'

const InviteAlert = () => {
  const allInvites = useObservable(db.cloud.invites)
  const invites = allInvites?.filter((i) => !i.accepted && !i.rejected)

  return (
    <>
      <Badge badgeContent={invites?.length} color="primary">
        <NotificationsIcon color="action" />
      </Badge>
    </>
  )
}

export { InviteAlert }
