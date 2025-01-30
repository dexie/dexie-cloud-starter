'use client'

import Dexie, { Table } from 'dexie'
import dexieCloud, {
  DBRealmMember,
  defineYDocTrigger,
  getTiedRealmId,
} from 'dexie-cloud-addon'
import { useLiveQuery } from 'dexie-react-hooks'
import * as Y from 'yjs'
import * as awarenessProtocol from 'y-protocols/awareness'
import { docToHtml } from '../lib/docToHtml'
import { extractLunrKeywords } from './fullTextSearch'
import { query } from '../lib/query'
import { populate } from '../lib/populate'
import { Editor } from '@tiptap/react'

export interface AutoSelectMember {
  inputValue?: string
  title: string
  year?: number
}
export interface ICard {
  id: string
  createdAt: string
  title: string
  doc: Y.Doc
  docHtml?: string
  fullTextIndex: string[]
  description?: string
  realmId?: string
  owner?: string
  spaceId?: string
}

export interface ISpace {
  id: string
  title: string
  createdAt: string
  realmId?: string
  owner?: string
}

export interface IImage {
  id: string
  createdAt: string
  cardId?: string
  file: Blob
  fileType: string // ex. 'image/png' or 'image/jpeg'
  realmId?: string
}

export interface ISpaceList extends ISpace {
  cards: ICard[]
}

export class DexieStarter extends Dexie {
  card!: Table<ICard, string>
  space!: Table<ISpace, string>
  image!: Table<IImage, string>

  constructor() {
    super('DexieStarter', {
      Y,
      gc: false,
      addons: [dexieCloud],
    })

    this.version(1).stores({
      card: `
        id,
        realmId,
        *fullTextIndex,
        doc:Y,
        spaceId`,
      space: `
        id,
        title`,
      setting_local: '++id, key',
      image: `
        id,
        cardId,
        realmId
    `,
    })

    // A trigger to set the docHtml string attribute from Y.Doc content
    defineYDocTrigger(this.card, 'doc', async (ydoc, parentId) => {
      const html = await docToHtml(ydoc as Y.Doc)
      await this.card.update(parentId, {
        docHtml: html,
        fullTextIndex: extractLunrKeywords(html),
      })
    })

    this.cloud.configure({
      databaseUrl:
        process.env.NEXT_PUBLIC_DEXIE_CLOUD_DB_URL ||
        'https://your-dexie-db.dexie.cloud',

      // List tables that are local only:
      unsyncedTables: ['setting_local'],
      // Let computed properties be local only (for faster searching and rendering of docuemnts)
      // These properties are computed locally using defineYDocTrigger() above.
      unsyncedProperties: {
        card: [
          'docHtml', // docHtml is a locally computed HTML version of doc
          'fullTextIndex', // fullTextIndex is the searchable lunr words extracted from docHtml
        ] satisfies (keyof ICard)[], // ('satisfies' gives us stricter typings for the property names in the list)
      },

      // Enable Y.js awareness
      awarenessProtocol: awarenessProtocol,

      // Enable custom login GUI
      customLoginGui: true,

      // Require authentication and allow magic email links to auto-login user
      requireAuth: {
        email: query.email?.toString(),
        otpId: query.otpId?.toString(),
        otp: query.otp?.toString(),
      },
    })
  }
}

export const createCard = async (card: ICard) => {
  const realmId = card.spaceId && getTiedRealmId(card.spaceId)
  card.realmId = realmId

  try {
    await db.card.add(card)
  } catch (e) {
    console.error(e)
  }
}

/*export const updateCard = async (id: string, content: string) => {
  try {
    await db.card.where('id').equals(id).modify({ description: content })
  } catch (e) {
    console.error(e)
  }
}*/

export async function addImageToCard(cardId: string, file: File) {
  const card = await db.card.where('id').equals(cardId).first()
  if (!card) {
    console.error('Card not found for image')
    return
  }

  const newImage: IImage = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    cardId,
    file: file, // Dexie klarar av att lagra Blob/File direkt
    fileType: file.type,
    realmId: card?.realmId,
  }
  await db.image.add(newImage)
  return newImage
}

export async function getImagesByCardId(cardId: string) {
  return await db.image.where('cardId').equals(cardId).toArray()
}

export async function insertFirstCardImage(editor: Editor, cardId: string) {
  const images = await getImagesByCardId(cardId)
  if (!images.length) return

  // Ta första bilden
  const img = images[0]
  const objectURL = URL.createObjectURL(img.file)

  editor.chain().focus().setImage({ src: objectURL }).run()
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export async function insertCardImageAsBase64(editor: Editor, cardId: string) {
  const images = await getImagesByCardId(cardId)
  if (!images.length) return

  const base64 = await blobToBase64(images[0].file)
  editor.chain().focus().setImage({ src: base64 }).run()
}

export const updateCardTitle = async (id: string, title: string) => {
  try {
    await db.card.where('id').equals(id).modify({ title: title })
  } catch (e) {
    console.error(e)
  }
}

export const deleteCard = async (id: string) => {
  try {
    await db.card.where('id').equals(id).delete()
    await db.image.where('cardId').equals(id).delete()
  } catch (e) {
    console.error(e)
  }
}

export const createSpace = async (card: ISpace) => {
  try {
    await db.space.add(card)
  } catch (e) {
    console.error(e)
  }
}
export const useLiveDataSpaces = (id?: string): ISpaceList[] => {
  const spaces = useLiveQuery(async () => {
    try {
      const spaces = id
        ? await db.space.where('id').equals(id).toArray()
        : await db.space.limit(50).toArray()
      const cards = await db.card.limit(10).toArray()
      return spaces.map((space) => {
        const spaceCards = cards.filter((card) => card.realmId === space.id)
        return { ...space, cards: spaceCards }
      })
    } catch {
      return []
    }
  }, []) as ISpaceList[]

  return spaces?.sort((a, b) => b.createdAt?.localeCompare(a.createdAt)) || []
}

export const useLiveDataCards = (
  keyword: string,
  spaceId?: string,
): ICard[] => {
  const cards = useLiveQuery(async () => {
    try {
      if (!keyword) return await db.card.limit(50).toArray()

      const keywords = extractLunrKeywords(keyword)
      if (keywords.length === 0) return []
      console.log('lunr keywords', keywords)

      if (keywords.length === 1) {
        // One keyword search:
        const results = await db.card
          .where('fullTextIndex')
          .startsWith(keywords[0])
          .limit(50)
          .toArray()
        return results
          .flat()
          .filter((o, i, a) => a.findIndex((t) => t.id === o.id) === i)
      } else {
        // Multi-keyword search.
        // 1) Get all primary keys for each keyword
        const results = await Promise.all(
          keywords.map((keyWord) =>
            db.card.where('fullTextIndex').startsWith(keyWord).primaryKeys(),
          ),
        )
        // 2) Find the intersection of all primary keys
        const intersection = results.reduce((a, b) => {
          const set = new Set(b)
          return a.filter((k) => set.has(k))
        })
        // 3) Get the cards for the intersection (max 50 cards)
        return await db.card.bulkGet(intersection.slice(0, 50))
      }
    } catch {
      return []
    }
  }, [keyword]) as ICard[]

  return (
    cards
      ?.filter((c) => (spaceId ? c.spaceId === spaceId : true))
      ?.sort((a, b) => b.createdAt?.localeCompare(a.createdAt)) || []
  )
}

export const getCardById = async (id: string): Promise<ICard | undefined> => {
  try {
    return await db.card.where('id').equals(id).first()
  } catch {
    return
  }
}

export const useLiveSpaceMembers = (space?: ISpaceList): DBRealmMember[] => {
  const members = useLiveQuery(async () => {
    if (!space) return []

    try {
      const returnMembers = await db.members
        .where('realmId')
        .equals(space.realmId || '')
        .toArray()

      return returnMembers
    } catch {
      return []
    }
  }, [space]) as DBRealmMember[]

  return members
}

export const useLiveAllMembers = (): DBRealmMember[] => {
  const members = useLiveQuery(() => {
    try {
      return db.members.toArray()
    } catch {
      return []
    }
  }, []) as DBRealmMember[]

  return members
}

export function shareSpaceList(space: ISpace, ...friends: DBRealmMember[]) {
  return db
    .transaction('rw', [db.card, db.space, db.realms, db.members], () => {
      // Add or update a realm, tied to the todo-list using getTiedRealmId():
      const realmId = getTiedRealmId(space.id || '')
      space.realmId = realmId

      db.realms
        .put({
          realmId,
          name: space.title,
          represents: 'A shared space of inspiration',
        })
        .catch((e) => {
          console.error('Error updating realm', e)
        })

      db.space.update(space.id, { realmId }).catch((e) => {
        console.error('Error updating space', e)
      })

      db.card
        .where('spaceId')
        .equals(space.id)
        .modify({
          realmId,
        })
        .catch((e) => {
          console.error('Error updating card', e)
        })

      // Add the members to share it to:
      db.members
        .bulkAdd(
          friends.map((friend) => ({
            realmId,
            email: friend.email,
            name: friend.name,
            invite: true,
            permissions: {
              manage: '*', // Give your friend full permissions within this new realm.
            },
          })),
        )
        .catch((e) => {
          console.error('Error updating members', e)
        })
    })
    .catch((e) => {
      console.error(e)
    })
}

export function unshareSpaceList(object: ISpace, members: DBRealmMember[]) {
  const realmId = object.realmId || ''

  return db.members
    .where('[email+realmId]')
    .anyOf(
      members.map(
        (member) => [member.email ?? '', realmId] as [string, string],
      ),
    )
    .delete()
}

let db: DexieStarter

try {
  db = new DexieStarter()
  console.log('Database initialized successfully')
} catch (error) {
  console.error('Failed to initialize the database:', error)
}

const initializeDatabase = async () => {
  try {
    db.on('blocked', (blocked) => {
      const errorMessage =
        'Database upgrade blocked. Please close other open tabs using this app.'
      console.error(errorMessage, blocked)
    })

    console.log('Database initialized and ready event subscribed.')
    await populate()
  } catch (error) {
    let errorMessage = 'Failed to initialize the database.'
    if (error instanceof Error) {
      errorMessage = error.message
    }
    console.error(errorMessage, error)
  }
}

// Start database initialization
if (typeof window !== 'undefined') {
  initializeDatabase()
}

export { db }
