import { useLiveQuery, useObservable } from 'dexie-react-hooks'
import { FC, useEffect, useState } from 'react'
import { alpha, Avatar, Box, SxProps, useTheme } from '@mui/material'
import { db } from '../db/db'
import { hexify, stringToColor, invertColor } from '../lib/color-handling'

interface AvatarProp {
  realmId: string
  selected?: boolean
  compact?: boolean
  single?: boolean
  sx?: SxProps
}

interface MemberAvatar {
  email: string
  pending: boolean
  owner?: boolean
}

const Avatars: FC<AvatarProp> = ({ realmId, selected, sx, single }) => {
  const currentUser = useObservable(db.cloud.currentUser)
  const members = useLiveQuery(() => {
    try {
      if (!realmId) return []

      return db.members.where('realmId').equals(realmId).toArray()
    } catch {
      return []
    }
  }, [realmId])

  const [avatars, setAvatars] = useState<MemberAvatar[]>([])
  const theme = useTheme()

  useEffect(() => {
    async function getAvatars() {
      if (!members) return
      const memberAvatar: MemberAvatar[] = []

      members.map((member, i) => {
        if (i === 0)
          memberAvatar.push({
            email: member.owner as string,
            pending: false,
            owner: true,
          })

        if (!member.email) return
        if (memberAvatar.find((ma) => ma.email == member.email)) return

        const memberEmailObject = {
          email: member.email as string,
          pending: member.accepted ? false : true,
        }

        memberAvatar.push(memberEmailObject)
      })

      setAvatars(
        single
          ? [
              memberAvatar
                .filter((ma) => ma.email !== currentUser?.email)
                .sort(
                  (a, b) =>
                    (b.owner === true ? -1 : a.owner === true ? 1 : 0) ||
                    (a.pending ? -1 : 1),
                )
                .reverse()[0],
            ]
          : memberAvatar
              .filter((ma) => ma.email !== currentUser?.email)
              .sort(
                (a, b) =>
                  (b.owner === true ? -1 : a.owner === true ? 1 : 0) ||
                  (a.pending ? -1 : 1),
              ),
      )
    }

    getAvatars()
  }, [currentUser?.userId, realmId, members, currentUser?.email, single])

  return (
    <Box style={{ display: 'flex' }} alignItems="center">
      {avatars?.map((avatar, index) => (
        <Avatar
          key={realmId + avatar.email + index}
          sx={{
            ...sx,
            opacity: avatar.pending ? 0.25 : 1,
            bgcolor: hexify(
              alpha(stringToColor(avatar.email), 0.5),
              alpha(theme.palette.background.default, 1),
            ),
            width: 24,
            height: 24,
            border:
              '2px solid ' +
              hexify(
                alpha(theme.palette.text.primary, selected ? 0.11 : 0.05),
                alpha(theme.palette.background.default, 1),
              ),
            fontSize: '0.7rem',
            color: alpha(invertColor(stringToColor(avatar.email)), 0.8),
            paddingRight: avatars.length > 1 && index == 0 ? '4px' : '0px',
            marginLeft:
              index == 0
                ? '0px'
                : avatars != undefined && avatars.length > 4
                  ? '-20px'
                  : 20 / avatars.length - 18 + 'px',
          }}
          title={avatar.email}
        >
          {avatar.email?.slice(0, 2)}
        </Avatar>
      ))}
    </Box>
  )
}

export default Avatars
