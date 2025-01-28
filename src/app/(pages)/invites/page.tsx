'use client'

import { useObservable } from 'dexie-react-hooks'
import { db } from '@/app/db/db'
import { Typography, alpha, Divider, Avatar, Box } from '@mui/material'
import theme from '@/theme'
import { invertColor, stringToColor } from '@/app/lib/color-handling'
import {
  CheckCircleOutline,
  HighlightOff,
  Notifications,
} from '@mui/icons-material'
import { Invite } from 'dexie-cloud-addon'

export default function Invites() {
  const allInvites = useObservable(db.cloud.invites)
  const invites = allInvites?.filter((i) => !i.accepted && !i.rejected)

  return (
    <Box className="App" style={{ maxWidth: '900px', margin: 'auto' }}>
      {invites && invites.length > 0 ? (
        <>
          {invites && invites.length > 0
            ? 'Pending invites'
            : 'No pending invites'}
          <Box>
            {invites
              ?.sort(
                (a: Invite, b: Invite) =>
                  (b.invitedDate?.getTime() || 0) -
                  (a.invitedDate?.getTime() || 0),
              )
              .map((invite: Invite, i) => (
                <Box
                  key={'invite-' + i}
                  style={{
                    padding: '30px',
                    userSelect: 'none',
                    backgroundColor: theme.palette.background.default,
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    boxShadow: theme.shadows[13],
                    borderRadius: '10px',
                    marginTop: '20px',
                  }}
                >
                  <>
                    {i > 0 && (
                      <Divider
                        light={true}
                        style={{
                          width: '100%',
                          padding: '30px',
                          marginBottom: '60px',
                        }}
                      />
                    )}

                    <Avatar
                      sx={{
                        bgcolor: alpha(
                          stringToColor(invite.invitedBy?.email || ''),
                          0.8,
                        ),
                        width: 120,
                        height: 120,
                        border: '2px solid ' + theme.palette.background.default,
                        fontSize: '1.3rem',
                        marginBottom: '20px',
                        color: alpha(
                          invertColor(
                            stringToColor(invite.invitedBy?.email || ''),
                          ),
                          0.8,
                        ),
                      }}
                      title={invite.invitedBy?.name}
                    >
                      {invite.invitedBy?.name.slice(0, 2)}
                    </Avatar>
                  </>
                  <Box
                    key={invite.id}
                    sx={{
                      display: 'flex',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginTop: i == 0 ? '0px' : '20px',
                      width: '100%',
                    }}
                  >
                    <Box
                      style={{
                        display: 'flex',
                        flexGrow: 1,
                        flexDirection: 'column',
                        justifyContent: 'flex-start',
                        alignItems: 'flex-start',
                        marginRight: '20px',
                        width: '100%',
                      }}
                    >
                      <Typography
                        sx={{
                          fontWeight: 400,
                          fontSize: '20px',
                          color: invite.realm?.name
                            ? theme.palette.text.primary
                            : theme.palette.text.disabled,
                        }}
                      >
                        {invite.realm?.name ? invite.realm?.name : 'New share'}
                      </Typography>
                      <Box
                        style={{
                          fontSize: '10px',
                          margin: '0px',
                          color: theme.palette.text.secondary,
                        }}
                      >
                        Invite from {invite.invitedBy?.name}
                      </Box>
                    </Box>
                    <>
                      <Box
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginRight: '30px',
                        }}
                      >
                        <CheckCircleOutline
                          style={{
                            width: '34px',
                            height: '34px',
                            color: theme.palette.success.light,
                            marginRight: '4px',
                            cursor: 'pointer',
                          }}
                          onClick={() => {
                            db.members.update(invite.id!, {
                              accepted: new Date(),
                            })
                          }}
                        />
                        <Box
                          style={{
                            fontSize: '10px',
                            color: theme.palette.text.disabled,
                          }}
                        >
                          Accept
                        </Box>
                      </Box>
                      <Box
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <HighlightOff
                          style={{
                            width: '34px',
                            height: '34px',
                            color: theme.palette.error.light,
                            marginRight: '4px',
                            cursor: 'pointer',
                          }}
                          onClick={() =>
                            db.members.update(invite.id!, {
                              rejected: new Date(),
                            })
                          }
                        />
                        <Box
                          style={{
                            fontSize: '10px',
                            color: theme.palette.text.disabled,
                          }}
                        >
                          Reject
                        </Box>
                      </Box>
                    </>
                  </Box>
                </Box>
              ))}
          </Box>
        </>
      ) : (
        <Box
          style={{
            padding: '30px',
            userSelect: 'none',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: '20px',
            color: alpha(theme.palette.text.primary, 0.16),
            fontSize: '24px',
            textAlign: 'center',
            height: '100%',
          }}
        >
          <Notifications
            style={{
              color: alpha(theme.palette.text.primary, 0.11),
              width: '136px',
              height: '136px',
            }}
          />
          You have no pending invites.
        </Box>
      )}
    </Box>
  )
}
