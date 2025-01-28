'use client'

import { Box, Typography } from '@mui/material'
import { useLiveDataSpaces } from '@/app/db/db'
import { useSearch } from '../../SearchContext'
import CardList from '@/app/components/CardList'
interface PageProps {
  params: {
    id: string
  }
}

export default function Spaces({ params }: PageProps) {
  const { id } = params
  const { searchKeyword } = useSearch()

  const space = useLiveDataSpaces(id)[0]

  if (!space) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '100%',
        }}
      >
        <Typography variant="h5">No space on this id</Typography>
      </Box>
    )
  }

  return <CardList searchKeyword={searchKeyword} id={id} />
}
