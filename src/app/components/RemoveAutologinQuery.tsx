'use client'

import { useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useObservable } from 'dexie-react-hooks'
import { UserLogin } from 'dexie-cloud-addon'
import { db } from '../db/db'

export default function RemoveSpecificQueryParams() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Get the current user from the database
  const userFromDb = useObservable(db?.cloud?.currentUser) as
    | Partial<UserLogin>
    | undefined

  useEffect(() => {
    // Create a user object with default values if the user is not logged in
    const dexieCloudUser: UserLogin = {
      userId: userFromDb?.userId ?? 'unauthorized',
      email: userFromDb?.email ?? '',
      isLoggedIn: userFromDb?.isLoggedIn ?? false,
      claims: userFromDb?.claims ?? [],
      lastLogin: userFromDb?.lastLogin ?? new Date(0),
    }

    if (dexieCloudUser.isLoggedIn) {
      // Copy the search params to a new object
      const params = new URLSearchParams(searchParams.toString())
      const keysToRemove = ['email', 'otp', 'otpId']
      let modified = false

      keysToRemove.forEach((key) => {
        if (params.has(key)) {
          params.delete(key)
          modified = true
        }
      })

      if (modified) {
        const newQuery = params.toString()
        router.replace(pathname + (newQuery ? `?${newQuery}` : ''))
      }
    }
  }, [
    searchParams,
    pathname,
    router,
    userFromDb?.userId,
    userFromDb?.email,
    userFromDb?.isLoggedIn,
    userFromDb?.claims,
    userFromDb?.lastLogin,
  ])

  return null
}
