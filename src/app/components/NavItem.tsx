"use client"

import {
  AppBar,
  Toolbar,
  Typography,
  TextField,
  Container,
  Box,
} from "@mui/material"
import { usePathname, useRouter } from "next/navigation"
import theme from "@/theme"
import Link from "next/link"

interface NavItemProps {
  name: string
  href: string
}

export const NavItem = ({ name, href }: NavItemProps) => {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <Link href={href}>
      <Typography
        variant="body1"
        sx={{
          mx: 2,
          pt: 1,
          borderTop: pathname.includes(href)
            ? `solid 4px ${theme.palette.primary.main}`
            : `solid 4px transparent`,
          fontSize: "1.2rem", // Större textstorlek vid aktivt val
        }}
        color="primary"
      >
        {name}
      </Typography>
    </Link>
  )
}
