'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Dexie from 'dexie'

const Logout = () => {
  const dbLink =
    (process.env.NEXT_PUBLIC_DEXIE_CLOUD_DB_URL || '')
      .split('//')[1]
      ?.split('.')[0] || ''

  const dbName = 'DexieStarter-' + dbLink

  const [message, setMessage] = useState('Logging out...')
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    let navigationTimer: ReturnType<typeof setTimeout> | undefined

    async function logout() {
      try {
        const dbExists = await Dexie.exists(dbName)
        if (cancelled) return

        if (dbExists) {
          setMessage('Deleting database...')
          await Dexie.delete(dbName)
          if (cancelled) return
          setMessage('Cleaning up...')
          navigationTimer = setTimeout(() => window.location.reload(), 3000)
        } else {
          navigationTimer = setTimeout(() => router.replace('/'), 3000)
        }
      } catch (error) {
        if (cancelled) return
        setMessage(error instanceof Error ? error.message : String(error))
        navigationTimer = setTimeout(() => window.location.reload(), 3000)
      }
    }

    void logout()
    return () => {
      cancelled = true
      clearTimeout(navigationTimer)
    }
  }, [dbName, router])

  return (
    <>
      <title>{message}</title>
      <div>{message}</div>
    </>
  )
}

export default Logout
