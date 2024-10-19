import { UserLogin } from "dexie-cloud-addon"
import { db } from "../db/db"
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"

export const deleteUserAccount = async (
  user: UserLogin,
  router: AppRouterInstance
) => {
  if (!user?.userId) return // Safety check

  const confirmed = confirm(`
      Are you sure you want to delete your user completely along all stored 
      data for ${user?.userId}?
      Private data will be deleted. Shared data will not be deleted. This action cannot be undone.`)

  if (!confirmed) return

  try {
    const url = `${db.cloud.options?.databaseUrl}/users/${user.userId}`

    const options = {
      url,
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${user.accessToken}`,
      },
    }

    await fetch(options)
      .catch((error) => {
        console.error("Error deleting user", error)
      })
      .then(() => {
        router.push("/logout")
      })
  } catch (error) {
    console.error("Error deleting user", error)
  }
}
