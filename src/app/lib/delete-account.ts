import { UserLogin } from 'dexie-cloud-addon'
import { db } from '../db/db'
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'

export const deleteUserAccount = async (
  user:
    | UserLogin
    | {
        userId: string
        email: string
      },
  router: AppRouterInstance,
) => {
  if (!user?.userId) return

  const confirmed =
    confirm(`Are you sure you want to delete your user completely along all stored data for ${user?.userId}?
    
Private data will be deleted. Shared data will not be deleted. This action cannot be undone.`)

  if (!confirmed) return

  try {
    const url = `${db.cloud.options?.databaseUrl}/users/${user.userId}`

    // Check if the user has an access token
    if ('accessToken' in user && user.accessToken) {
      const options = {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${user.accessToken}`,
        },
      }

      await fetch(url, options)
        .catch((error) => {
          console.error('Error deleting user', error)
        })
        .then(() => {
          router.push('/logout')
        })
    } else {
      console.error('User does not have an access token.')
    }
  } catch (error) {
    console.error('Error deleting user', error)
  }
}
