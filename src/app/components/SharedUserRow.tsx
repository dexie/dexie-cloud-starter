'use client'

import { useObservable } from 'dexie-react-hooks'
import { useState } from 'react'
import dayjs from 'dayjs'
import {
  Box,
  Button,
  Divider,
  Menu,
  MenuItem,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { db, ISpace } from '../db/db'
import SingleAvatar from './SingleAvatar'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import { DBRealmMember } from 'dexie-cloud-addon'
interface ShareUserRowProps {
  deleteAction: (member: DBRealmMember) => void
  space?: ISpace
  member: DBRealmMember
}

const ShareUserRow = ({ deleteAction, member, space }: ShareUserRowProps) => {
  const theme = useTheme()
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'))

  const dexieCloudUser = useObservable(db.cloud.currentUser) || {
    userId: 'unauthorized',
    email: '',
  }

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleClick = (
    event: React.MouseEvent<HTMLButtonElement | HTMLDivElement>,
  ) => {
    event.stopPropagation()
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  return (
    <Box
      key={member.id}
      sx={{
        display: 'flex',
        pt: 1,
        pb: 1,
        fontSize: '14px',
        alignItems: 'center',
      }}
    >
      <SingleAvatar
        member={member}
        sx={{
          width: '40px',
          height: '40px',
          fontSize: '14px',
        }}
      />
      <Box
        sx={{
          flexGrow: 1,
          ml: 1,
          mr: 1,
          opacity: member.accepted ? 1 : 0.55,
          textDecoration: member.rejected ? 'line-through' : 'none',
          wordBreak: 'break-all',
        }}
      >
        {member.userId ? member.userId : member.email}
        {dexieCloudUser.email == member.userId ||
        dexieCloudUser.email == member.email
          ? ` (You)`
          : ''}
        <Box
          sx={{
            fontSize: '12px',
            color: theme.palette.text.disabled,
          }}
        >
          {member.userId == dexieCloudUser.email
            ? `${'Created'} ${dayjs(space?.createdAt).toISOString()}`
            : member.rejected
              ? `${'Rejected'} ${dayjs(member.rejected).toISOString()}`
              : member.accepted
                ? `${'Accepted'} ${dayjs(member.invitedDate).toISOString()}`
                : `${'Invite sent'} ${dayjs(member.invitedDate).toISOString()}`}
        </Box>
      </Box>
      <Box
        sx={{
          color: theme.palette.text.secondary,
        }}
      >
        {member.userId == member.owner ? (
          <>{'Owner'}</>
        ) : isSmallScreen ? (
          <Box onClick={handleClick}>
            <ArrowDropDownIcon style={{ width: '12px', height: '12px' }} />
          </Box>
        ) : (
          <Button
            sx={{
              fontSize: '12px',
              color: theme.palette.text.secondary,
              textTransform: 'none',
              fontWeight: '400',
              fontSmooth: 'antialiased',
            }}
            onClick={handleClick}
            endIcon={
              <ArrowDropDownIcon style={{ width: '12px', height: '12px' }} />
            }
          >
            {'Editor'}
          </Button>
        )}
      </Box>
      <Menu
        id="basic-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'basic-button',
        }}
      >
        <MenuItem onClick={handleClose}>{'Editor'}</MenuItem>
        <Divider />
        <MenuItem onClick={() => deleteAction(member)}>
          {'Remove access'}
        </MenuItem>
      </Menu>
    </Box>
  )
}

export default ShareUserRow
