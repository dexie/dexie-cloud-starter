"use client"

import { useObservable } from "dexie-react-hooks"
import { Badge } from "@mui/material"
import NotificationsIcon from "@mui/icons-material/Notifications"
import { db } from "../db/db"

const InviteAlert = () => {
  const currentUser = useObservable(db.cloud.currentUser)
  const allInvites = useObservable(db.cloud.invites)
  const invites = allInvites?.filter((i) => !i.accepted && !i.rejected)

  if (!currentUser) return null

  //   if (!invites || invites.length == 0) return <></>
  console.log("invites", invites)

  return (
    <>
      <Badge badgeContent={invites?.length} color="primary">
        <NotificationsIcon color="action" />
      </Badge>
    </>
  )
}

export { InviteAlert }
