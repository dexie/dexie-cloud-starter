"use client"

import {
  AppBar,
  Toolbar,
  Typography,
  TextField,
  Container,
  Box,
} from "@mui/material"
import theme from "@/theme"
import Divider from "@mui/material/Box"
import { useObservable } from "dexie-react-hooks"
import { useRouter } from "next/navigation"
import HistoryIcon from "@mui/icons-material/History"
import { ReactNode, useEffect } from "react"
import { db } from "../db/db"
import React from "react"
import { SearchProvider, useSearch } from "./SearchContext"
import { NavItem } from "../components/NavItem"
import { deleteUserAccount } from "../lib/delete-account"
import PersonRemoveIcon from "@mui/icons-material/PersonRemove"
import LogoutIcon from "@mui/icons-material/Logout"
import { InviteAlert } from "../components/InviteAlert"

export default function Template({ children }: { children: ReactNode }) {
  const router = useRouter()

  const dexieCloudUser = useObservable(db?.cloud?.currentUser) || {
    userId: "unauthorized",
    email: "",
  }

  useEffect(() => {
    if (dexieCloudUser.userId === "unauthorized") {
      router.push("/")
    }
  }, [dexieCloudUser.userId, router])

  return (
    <SearchProvider>
      <Container
        maxWidth={false}
        disableGutters
        sx={{
          minHeight: "100vh",
        }}
      >
        <AppBar position="static" color="transparent" elevation={0}>
          <Toolbar
            sx={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "flex-start",
              padding: "0 16px",
            }}
          >
            <SearchField />
            <Box
              sx={{
                mx: 2,
                borderTop: `solid 6px transparent`,
                pt: 1,
                color: theme.palette.primary.main,
                cursor: "pointer",
              }}
              onClick={() => {
                router.push("/invites")
              }}
            >
              <InviteAlert />
            </Box>
            <NavItem name="Everything" href="/everything" />
            <NavItem name="Spaces" href="/spaces" />
            <NavItem name="Serendipity" href="/serendipity" />

            <Typography
              variant="body1"
              sx={{
                mx: 2,
                borderTop: `solid 4px transparent`,
                pt: 1,
                cursor: "pointer",
                color: theme.palette.primary.main,
              }}
              onClick={() => {
                confirm("Reset all stored data?") && db.card.clear()
              }}
            >
              <HistoryIcon />
            </Typography>

            <Typography
              variant="body1"
              sx={{
                mx: 2,
                borderTop: `solid 4px transparent`,
                pt: 1,
                cursor: "pointer",
                color: theme.palette.primary.main,
              }}
              onClick={() => {
                deleteUserAccount(dexieCloudUser as any, router)
              }}
            >
              <PersonRemoveIcon />
            </Typography>
            <Typography
              variant="body1"
              sx={{
                mx: 2,
                borderTop: `solid 4px transparent`,
                pt: 1,
                color: theme.palette.primary.main,
              }}
              onClick={() => {
                confirm("Logout and remove local database?") &&
                  router.push("/logout")
              }}
            >
              <LogoutIcon />
            </Typography>
          </Toolbar>
        </AppBar>
        <Box sx={{ p: 2, pt: 0, mt: 0 }}>
          <Divider
            sx={{
              mb: 2,
              width: "100%",
              border: `solid 1px ${theme.palette.divider}`,
            }}
          />
          {children}
        </Box>
      </Container>
    </SearchProvider>
  )
}

// Sökfältet som använder Context
function SearchField() {
  const { searchKeyword, setSearchKeyword } = useSearch()

  return (
    <TextField
      fullWidth
      variant="outlined"
      placeholder="Search my mind..."
      value={searchKeyword}
      onChange={(e) => setSearchKeyword(e.target.value)} // Uppdaterar sökordet
      InputProps={{
        style: {
          font: "400 70px / 84px var(--font-caveat)",
          fontStyle: "italic",
        },
      }}
      sx={{
        flexGrow: 1,
        fontStyle: "italic",
        color: "text.secondary",
        "& .MuiOutlinedInput-root": {
          "& fieldset": {
            border: "none",
          },
          "&:hover fieldset": {
            border: "none",
          },
          "&.Mui-focused fieldset": {
            border: "none",
          },
        },
      }}
    />
  )
}
