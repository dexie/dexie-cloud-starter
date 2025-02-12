'use client'

import CardList from '@/app/components/CardList'
import { useSearch } from './(pages)/SearchContext'

export default function Everything() {
  const { searchKeyword } = useSearch()

  return <CardList searchKeyword={searchKeyword} />
}
