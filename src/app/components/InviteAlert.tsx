"use client"

import { useObservable } from "dexie-react-hooks"
import { Badge } from "@mui/material"
import NotificationsIcon from "@mui/icons-material/Notifications"
import { db } from "../db/db"
import { useState, useEffect } from "react"

const InviteAlert = () => {
  const allInvites = useObservable(db.cloud.invites)
  const [invites, setInvites] = useState<any[]>([])

  useEffect(() => {
    if (allInvites) {
      setInvites(allInvites.filter((i) => !i.accepted && !i.rejected))
    }
  }, [allInvites])

  return (
    <>
      <Badge badgeContent={invites?.length} color="primary">
        <NotificationsIcon color="action" />
      </Badge>
    </>
  )
}

export { InviteAlert }
