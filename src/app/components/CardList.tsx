"use client"

import {
  Box,
  CircularProgress,
  alpha,
  Typography,
  DialogTitle,
  Autocomplete,
  Divider,
  TextField,
} from "@mui/material"
import Dialog from "@mui/material/Dialog"
import DialogContent from "@mui/material/DialogContent"
import theme from "@/theme"
import { Suspense, use, useEffect, useState } from "react"
import Masonry from "react-masonry-css"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline"
import * as Y from "yjs"
import { useDocument, useLiveQuery, useObservable } from "dexie-react-hooks"
import NewCard from "./NewCard"
import ItemCard from "./ItemCard"
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos"
import GroupIcon from "@mui/icons-material/Group"
import {
  AutoSelectMember,
  db,
  deleteCard,
  shareSpaceList,
  unshareSpaceList,
  updateCard,
  useLiveDataCards,
  useLiveDataSpaces,
  useLiveSpaceMembers,
} from "../db/db"
import Link from "next/link"
import { filter, uniqWith } from "lodash"
import ShareUserRow from "./SharedUserRow"
import dynamic from "next/dynamic"
import Avatars from "./Avatars"

const Tiptap = dynamic(
  () => import("../components/Tiptap").then((mod) => mod.default),
  {
    ssr: false,
  }
)

const breakpointColumnsObj = {
  default: 4,
  1100: 3,
  700: 2,
  500: 1,
}

interface CardListProps {
  searchKeyword: string
  id?: string // Valfritt id för urval
}

export default function CardList({
  searchKeyword,
  id: spaceId,
}: CardListProps) {
  const router = useRouter()
  const searchParams = useSearchParams() // Hämta query-parametrar
  const pathname = usePathname()

  const space = useLiveDataSpaces(spaceId)[0]
  const cards = useLiveDataCards(searchKeyword, spaceId)

  const [isModalEdit, setIsModalEdit] = useState<string | undefined>(undefined)
  const [isEdited, setIsEdited] = useState(false)
  const [canPost, setCanPost] = useState(false)
  const [isEditorEmpty, setIsEditorEmpty] = useState(true)

  // Share dialog
  const [showShareDialogOpen, setShowShareDialogOpen] = useState(false)
  const [addFriendValue, setAddFriendValue] = useState<AutoSelectMember | null>(
    null
  )
  const members = [] as any[] // useLiveSpaceMembers(space)
  const allMembers = useLiveSpaceMembers()

  const dexieCloudUser = useObservable(db.cloud.currentUser) || {
    userId: "unauthorized",
    email: "",
  }

  useEffect(() => {
    const modalParam = searchParams.get("edit")
    setIsModalEdit(modalParam || undefined)
  }, [searchParams])

  const rowBeingEdited = useLiveQuery(
    () =>
      isModalEdit ? db.card.where("id").equals(isModalEdit).first() : undefined,
    [isModalEdit]
  )
  const provider = useDocument(rowBeingEdited?.doc)

  const closeModal = () => {
    setIsModalEdit(undefined)
    router.push(pathname)
  }

  const handlePost = (content: string) => {
    if (!isModalEdit) return

    updateCard(isModalEdit, content)
    setCanPost(false)
    setIsEdited(false)
    setIsEditorEmpty(true)
  }

  async function shareProject(friend: string) {
    if (!friend || !members) return
    if (members.find((m) => m.email == friend.toLowerCase().trim())) return

    shareSpaceList(space, {
      name: friend.split("@")[0],
      email: friend.toLowerCase().trim(),
    })

    setAddFriendValue(null)
  }

  async function deleteSharedUser(member: any) {
    const members = []
    members.push(member)

    unshareSpaceList(space, members)
  }

  if (!cards) {
    return <CircularProgress />
  }

  console.log("Rendering CardList", space)

  return (
    <>
      {spaceId && (
        <>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-start",
                alignItems: "center",
              }}
            >
              <Link href={"/spaces"}>
                <ArrowBackIosIcon sx={{ mr: 2 }} />
              </Link>
              <Typography variant="h5">{space?.title}</Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                gap: 1,
              }}
            >
              <Avatars realmId={space?.realmId as string} compact />
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  cursor: "pointer",
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
              width: "100%",
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
          <ItemCard key={item.id} item={item} />
        ))}
      </Masonry>
      <Dialog
        fullWidth={true}
        maxWidth="lg"
        open={isModalEdit != undefined && rowBeingEdited != null}
        onClose={closeModal}
        PaperProps={{
          style: {
            minHeight: "90%",
            maxHeight: "90%",
            minWidth: "90%",
            maxWidth: "90%",
          },
        }}
      >
        <DialogContent
          sx={{
            display: "flex",
            height: "100%",
          }}
        >
          <Box
            sx={{
              flexGrow: 1,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Tiptap
              yDoc={rowBeingEdited?.doc || new Y.Doc()}
              provider={provider}
              setEditor={() => {}}
              setIsEdited={setIsEdited}
              setCanPost={setCanPost}
              setIsEditorEmpty={setIsEditorEmpty}
              getContent={() => {}}
              onPost={handlePost}
              style={{
                minWidth: "810px",
              }}
            />
          </Box>
          <Box
            sx={{
              backgroundColor: alpha(theme.palette.text.primary, 0.05),
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minWidth: "300px",
              borderRadius: 2,
            }}
          >
            <Box
              sx={{
                display: "flex",
                gap: 1,
                padding: 1,
                backgroundColor: alpha(theme.palette.text.primary, 0.05),
                borderRadius: "50%",
              }}
              onClick={() => {
                deleteCard(isModalEdit as string)
              }}
            >
              <DeleteOutlineIcon />
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
      <Dialog
        open={showShareDialogOpen}
        onClose={() => setShowShareDialogOpen(false)}
        maxWidth="xs"
      >
        <DialogTitle id="alert-dialog-title">{"Share"}?</DialogTitle>
        <DialogContent>
          <Box>
            <Autocomplete
              value={addFriendValue}
              onChange={(event, newValue: any) => {
                if (typeof newValue === "string") {
                  shareProject(newValue)
                } else if (newValue && newValue.inputValue) {
                  shareProject(newValue.inputValue)
                } else {
                  shareProject(newValue.title)
                }
                setAddFriendValue(null)
              }}
              filterOptions={(options, params) => {
                const filtered = filter(options, params)

                const { inputValue } = params
                // Suggest the creation of a new value
                const isExisting = options.some(
                  (option) => inputValue === option.title
                )
                if (inputValue !== "" && !isExisting) {
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
                uniqWith(
                  allMembers,
                  (a, b) =>
                    (a.email || "").toLowerCase().trim() ===
                    (b.email || "").toLowerCase().trim()
                )
                  ?.filter(
                    (m) =>
                      m.email &&
                      members?.map((i) => i.email).indexOf(m.email) == -1
                  )
                  .sort((a, b) => {
                    a.email = a.email || ""
                    b.email = b.email || ""
                    return a.email.localeCompare(b.email)
                  })
                  .map((member) => {
                    return {
                      title: member.email,
                    }
                  }) || []
              }
              getOptionLabel={(option) => {
                // Value selected with enter, right from the input
                if (typeof option === "string") {
                  return option
                }
                // Add "xxx" option created dynamically
                if (option.inputValue) {
                  return option.inputValue
                }
                // Regular option
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
                <TextField {...params} label={"Add people"} />
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
                  fontWeight: "500",
                  fontSize: "18px",
                  color: theme.palette.text.primary,
                  mb: 1,
                }}
              >
                {"People with access"}
              </Box>
              <Box
                sx={{
                  maxHeight: "400px",
                  overflowY: "auto",
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
                      owner: dexieCloudUser.email,
                      userId: dexieCloudUser.email,
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
