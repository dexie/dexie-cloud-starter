"use client"

import CardList from "@/app/components/CardList"
import { useSearch } from "../SearchContext"
import { useRouter, useSearchParams } from "next/navigation"

export default function Everything() {
  const { searchKeyword } = useSearch()

  return <CardList searchKeyword={searchKeyword} />
}
