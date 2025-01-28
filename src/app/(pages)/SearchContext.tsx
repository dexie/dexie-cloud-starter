'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
interface SearchContextType {
  searchKeyword: string
  setSearchKeyword: React.Dispatch<React.SetStateAction<string>>
}

const SearchContext = createContext<SearchContextType | null>(null)

export const useSearch = () => {
  const context = useContext(SearchContext)

  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider')
  }

  return context
}

export const SearchProvider = ({ children }: { children: ReactNode }) => {
  const [searchKeyword, setSearchKeyword] = useState('')

  return (
    <SearchContext.Provider value={{ searchKeyword, setSearchKeyword }}>
      {children}
    </SearchContext.Provider>
  )
}
