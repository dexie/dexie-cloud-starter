"use client"

import { useObservable } from "dexie-react-hooks"
import { db } from "./db/db"
import { useEffect, useState } from "react"
import SignIn from "./signin"
import { DXCUserInteraction } from "dexie-cloud-addon"
import { useRouter, useSearchParams } from "next/navigation"
import { populate } from "./lib/populate"

export default function Home() {
  const router = useRouter()
  const [showLogin, setShowLogin] = useState(false)

  const userInteraction = useObservable(db.cloud.userInteraction)
  const dexieCloudUser = useObservable(db.cloud.currentUser) || {
    userId: "unauthorized",
    email: "",
  }
  const searchParams = useSearchParams()

  useEffect(() => {
    if (dexieCloudUser.userId !== "unauthorized") {
      const params = new URLSearchParams(searchParams.toString())
      router.push(`/everything?${params.toString()}`)
    }
  }, [dexieCloudUser.userId, router, searchParams])

  useEffect(() => {
    if (userInteraction !== undefined) setShowLogin(true)
  }, [userInteraction])

  return (
    <>{showLogin && <SignIn {...(userInteraction as DXCUserInteraction)} />}</>
  )
}
