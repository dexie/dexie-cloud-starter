'use client'

import {
  Box,
  CircularProgress,
  alpha,
  Typography,
  DialogTitle,
  Autocomplete,
  Divider,
  TextField,
  createFilterOptions,
} from '@mui/material'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import theme from '@/theme'
import { useEffect, useRef, useState } from 'react'
import Masonry from 'react-masonry-css'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import * as Y from 'yjs'
import { useDocument, useLiveQuery, useObservable } from 'dexie-react-hooks'
import NewCard from './NewCard'
import ItemCard from './ItemCard'
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos'
import GroupIcon from '@mui/icons-material/Group'
import {
  AutoSelectMember,
  db,
  deleteCard,
  shareSpaceList,
  unshareSpaceList,
  updateCardTitle,
  useLiveAllMembers,
  useLiveDataCards,
  useLiveDataSpaces,
  useLiveSpaceMembers,
} from '../db/db'
import Link from 'next/link'
import { uniqWith } from 'lodash'
import ShareUserRow from './SharedUserRow'
import dynamic from 'next/dynamic'
import Avatars from './Avatars'
import { Editor } from '@tiptap/react'
import { DBRealmMember } from 'dexie-cloud-addon'

const Tiptap = dynamic(
  () => import('../components/tiptap').then((mod) => mod.default),
  {
    ssr: false,
  },
)

const breakpointColumnsObj = {
  default: 4,
  1100: 3,
  700: 2,
  500: 1,
}

interface CardListProps {
  searchKeyword: string
  id?: string
}

const filter = createFilterOptions<AutoSelectMember>()

export default function CardList({
  searchKeyword,
  id: spaceId,
}: CardListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const space = useLiveDataSpaces(spaceId)[0]
  const cards = useLiveDataCards(searchKeyword, spaceId)

  const [isModalEdit, setIsModalEdit] = useState<string | undefined>(undefined)

  const [showShareDialogOpen, setShowShareDialogOpen] = useState(false)
  const [addFriendValue, setAddFriendValue] = useState<AutoSelectMember | null>(
    null,
  )
  const members = useLiveSpaceMembers(space)
  const allMembers = useLiveAllMembers()

  const dexieCloudUser = useObservable(db.cloud.currentUser) || {
    userId: 'unauthorized',
    email: '',
  }

  useEffect(() => {
    const modalParam = searchParams.get('edit')
    setIsModalEdit(modalParam || undefined)
  }, [searchParams])

  const editorRef = useRef<Editor | null>(null)

  const rowBeingEdited = useLiveQuery(
    () =>
      isModalEdit ? db.card.where('id').equals(isModalEdit).first() : undefined,
    [isModalEdit],
  )
  const provider = useDocument(rowBeingEdited?.doc)

  const closeModal = () => {
    setIsModalEdit(undefined)
    router.push(pathname)
  }

  async function shareProject(friend: string) {
    if (!friend || !members) return
    if (members.find((m) => m.email == friend.toLowerCase().trim())) return

    shareSpaceList(space, {
      name: friend.split('@')[0],
      email: friend.toLowerCase().trim(),
      id: '',
      realmId: '',
      owner: '',
    })

    setAddFriendValue(null)
  }

  async function deleteSharedUser(member: DBRealmMember) {
    const members = []
    members.push(member)

    unshareSpaceList(space, members)
  }

  if (!cards) {
    return <CircularProgress />
  }

  return (
    <>
      {spaceId && (
        <>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'flex-start',
                alignItems: 'center',
              }}
            >
              <Link href={'/spaces'}>
                <ArrowBackIosIcon sx={{ mr: 2 }} />
              </Link>
              <Typography variant="h5">{space?.title}</Typography>
            </Box>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Avatars realmId={space?.realmId as string} compact />
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  cursor: 'pointer',
                }}
                onClick={() => setShowShareDialogOpen(true)}
              >
                <GroupIcon />
                Share
              </Box>
            </Box>
          </Box>
          <Divider
            sx={{
              my: 2,
              width: '100%',
              border: `solid 1px ${theme.palette.divider}`,
            }}
          />
        </>
      )}
      <Masonry
        breakpointCols={breakpointColumnsObj}
        className="my-masonry-grid"
        columnClassName="my-masonry-grid_column"
      >
        <NewCard spaceId={spaceId} />
        {cards.map((item) => (
          <Box key={item.id} sx={{}}>
            <ItemCard item={item} />
            <Box
              sx={{
                pt: 1.5,
                textAlign: 'center',
                fontSize: '0.9rem',
                opacity: 0.6,
              }}
            >
              {item.title}
            </Box>
          </Box>
        ))}
      </Masonry>
      <Dialog
        fullWidth={true}
        maxWidth="lg"
        open={isModalEdit != undefined && rowBeingEdited != null}
        onClose={closeModal}
        PaperProps={{
          style: {
            minHeight: '90%',
            maxHeight: '90%',
            minWidth: '90%',
            maxWidth: '90%',
          },
        }}
      >
        <DialogContent
          sx={{
            display: 'flex',
            height: '100%',
          }}
        >
          <Box
            sx={{
              flexGrow: 1,
              display: 'flex',
              overflowY: 'auto',
              padding: 2,
              width: '100%',
              minHeight: '100%',
            }}
          >
            <Tiptap
              yDoc={rowBeingEdited?.doc || new Y.Doc()}
              provider={provider}
              editorRef={editorRef}
              setCanPost={() => {}}
              style={{ minHeight: '100%', width: '100%' }}
              cardId={rowBeingEdited?.id || ''}
            />
          </Box>
          <Box
            sx={{
              backgroundColor: alpha(theme.palette.text.primary, 0.05),
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'center',
              minWidth: '300px',
              borderRadius: 2,
              padding: '30px 20px',
            }}
          >
            <Box
              sx={{
                width: '100%',
              }}
            >
              <TextField
                variant="standard"
                label="Title"
                value={rowBeingEdited?.title || ''}
                onChange={(e) => {
                  updateCardTitle(isModalEdit as string, e.target.value)
                }}
                sx={{
                  width: '100%',
                  marginBottom: '10px',
                }}
              />
            </Box>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                width: '100%',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  gap: 1,
                  padding: 1,
                  backgroundColor: alpha(theme.palette.text.primary, 0.05),
                  borderRadius: '50%',
                }}
                onClick={() => {
                  if (confirm('Are you sure you want to delete this card?')) {
                    deleteCard(isModalEdit as string)
                    closeModal()
                  }
                }}
              >
                <DeleteOutlineIcon />
              </Box>
              <Avatars realmId={rowBeingEdited?.realmId as string} compact />
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
      <Dialog
        open={showShareDialogOpen}
        onClose={() => setShowShareDialogOpen(false)}
        maxWidth="xs"
      >
        <DialogTitle id="alert-dialog-title">{'Share'}?</DialogTitle>
        <DialogContent>
          <Box>
            <Autocomplete
              value={addFriendValue}
              onChange={(event, newValue) => {
                if (typeof newValue === 'string') {
                  shareProject(newValue)
                } else if (newValue && typeof newValue.title === 'string') {
                  shareProject(newValue.title)
                }
                setAddFriendValue(null)
              }}
              filterOptions={(options, params) => {
                const filtered = filter(
                  options.map((option) => ({
                    ...option,
                    title: option.title || '',
                  })),
                  params,
                )

                const { inputValue } = params

                const isExisting = options.some(
                  (option) => inputValue === option.title,
                )

                if (inputValue !== '' && !isExisting) {
                  filtered.push({
                    inputValue,
                    title: `Add "${inputValue}"`,
                  })
                }

                return filtered
              }}
              selectOnFocus
              clearOnBlur
              blurOnSelect
              handleHomeEndKeys
              id="free-solo-with-text-demo"
              options={
                (uniqWith(
                  allMembers,
                  (a, b) =>
                    (a.userId || '').toLowerCase().trim() ===
                    (b.userId || '').toLowerCase().trim(),
                )
                  ?.filter((m) => {
                    const memberUserIds = members?.map((i) =>
                      i.userId?.toLowerCase().trim(),
                    )
                    const memberEmails = members?.map((i) =>
                      i.email?.toLowerCase().trim(),
                    )

                    return (
                      !memberUserIds?.includes(
                        m.userId?.toLowerCase().trim(),
                      ) &&
                      !memberEmails?.includes(m.email?.toLowerCase().trim())
                    )
                  })
                  .sort((a, b) => {
                    return (a.userId || '').localeCompare(b.userId || '')
                  })
                  .map((member) => ({
                    title: member.userId || '',
                  })) || []) as AutoSelectMember[]
              }
              getOptionLabel={(option) => {
                if (typeof option === 'string') {
                  return option
                }

                if (option.inputValue) {
                  return option.inputValue
                }

                return option.title
              }}
              renderOption={(props, option) => {
                const { key, ...restProps } = props
                return (
                  <li key={key || option.title} {...restProps}>
                    {option.title}
                  </li>
                )
              }}
              fullWidth
              freeSolo
              renderInput={(params) => (
                <TextField {...params} label={'Add people'} />
              )}
            />
          </Box>
          <Box>
            <Box
              sx={{
                mt: 3,
                mb: 1,
              }}
            >
              <Box
                sx={{
                  fontWeight: '500',
                  fontSize: '18px',
                  color: theme.palette.text.primary,
                  mb: 1,
                }}
              >
                {'People with access'}
              </Box>
              <Box
                sx={{
                  maxHeight: '400px',
                  overflowY: 'auto',
                }}
              >
                <Divider />
                {members != undefined && members.length > 0 ? (
                  <>
                    {members?.map((member, i) => (
                      <ShareUserRow
                        key={i}
                        member={member}
                        space={space}
                        deleteAction={deleteSharedUser}
                      />
                    ))}
                  </>
                ) : (
                  <ShareUserRow
                    member={{
                      email: dexieCloudUser.email,
                      owner: dexieCloudUser.email || '',
                      userId: dexieCloudUser.email,
                      id: dexieCloudUser.userId || '',
                      realmId: 'dexieCloudUser.email',
                    }}
                    space={space}
                    deleteAction={() => {}}
                  />
                )}

                <Divider />
              </Box>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  )
}
