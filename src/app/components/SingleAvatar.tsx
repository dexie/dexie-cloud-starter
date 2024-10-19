import { FC } from "react"
import { alpha, Avatar, SxProps, Theme, useTheme } from "@mui/material"
import { hexify, invertColor, stringToColor } from "../lib/color-handling"

interface AvatarProp {
  member: any
  sx?: SxProps<Theme>
}

const SingleAvatar: FC<AvatarProp> = ({ member, sx }) => {
  const theme = useTheme()

  if (!member) return null
  if (!member.email) member.email = member.userId

  return (
    <Avatar
      key={member.realmId + member.email}
      sx={{
        opacity: member.accepted ? 1 : 0.15,
        bgcolor: hexify(
          alpha(stringToColor(member.email), 0.8),
          alpha(theme.palette.background.default, 1)
        ),
        width: 24,
        height: 24,

        fontSize: "0.7rem",
        color: alpha(invertColor(stringToColor(member.email)), 0.8),
        ...sx,
      }}
      title={member.email}
    >
      {member.email?.slice(0, 2)}
    </Avatar>
  )
}

export default SingleAvatar
