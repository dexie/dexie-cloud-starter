"use client"

import {
  Box,
  CircularProgress,
  Chip,
  Button,
  Typography,
  alpha,
  TextField,
} from "@mui/material"
import { v4 as uuid } from "uuid"
import BookmarksIcon from "@mui/icons-material/Bookmarks"
import Dialog from "@mui/material/Dialog"
import DialogContent from "@mui/material/DialogContent"
import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import WorkspacesIcon from "@mui/icons-material/Workspaces"
import dayjs from "dayjs"
import ItemCard, { FIXED_HEIGHT } from "@/app/components/ItemCard"
import theme from "@/theme"
import Link from "next/link"
import { createSpace, useLiveDataCards, useLiveDataSpaces } from "@/app/db/db"
import { useSearch } from "../../SearchContext"
import CardList from "@/app/components/CardList"
interface PageProps {
  params: {
    id: string
  }
}

export default function Spaces({ params }: PageProps) {
  const { id } = params

  const router = useRouter()
  const { searchKeyword } = useSearch()
  const [isModalEdit, setIsModalEdit] = useState<string | undefined>(undefined)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newSpaceName, setNewSpaceName] = useState("")

  const space = useLiveDataSpaces(id)[0]
  const cards = useLiveDataCards(searchKeyword, id)

  const handlePost = () => {
    // Skapa en ny space
    // Stäng modalen
    createSpace({
      id: uuid(),
      title: newSpaceName,
      createdAt: dayjs().toISOString(),
    })
    setIsModalOpen(false)
  }

  if (!space) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          height: "100%",
        }}
      >
        <Typography variant="h5">No space on this id</Typography>
      </Box>
    )
  }

  return <CardList searchKeyword={searchKeyword} id={id} />
}
