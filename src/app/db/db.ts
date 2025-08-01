'use client'

import Dexie, { Table } from 'dexie'
import yDexie from 'y-dexie'
import dexieCloud, {
  DBRealmMember,
  defineYDocTrigger,
  getTiedRealmId,
} from 'dexie-cloud-addon'
import { useLiveQuery } from 'dexie-react-hooks'
import * as Y from 'yjs'
import { docToHtml } from '../lib/docToHtml'
import { extractLunrKeywords } from './fullTextSearch'
import { query } from '../lib/query'
import { prepopulatedItems } from '../lib/prepopulatedItems'

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

export interface ISpaceList extends ISpace {
  cards: ICard[]
}

export class DexieStarter extends Dexie {
  cards!: Table<ICard, string>
  spaces!: Table<ISpace, string>

  constructor() {
    super('DexieStarter', {
      addons: [yDexie, dexieCloud],
    })

    this.version(1).stores({
      cards: `
        id,
        realmId,
        *fullTextIndex,
        doc:Y.Doc,
        spaceId`,
      spaces: `
        id,
        title`,
      setting_local: '++id, key',
    })

    // A trigger to set the docHtml string attribute from Y.Doc content
    defineYDocTrigger(this.cards, 'doc', async (ydoc, parentId) => {
      const html = docToHtml(ydoc as Y.Doc)
      await this.cards.update(parentId, {
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
        cards: [
          'docHtml', // docHtml is a locally computed HTML version of doc
          'fullTextIndex', // fullTextIndex is the searchable lunr words extracted from docHtml
        ] satisfies (keyof ICard)[], // ('satisfies' gives us stricter typings for the property names in the list)
      } satisfies { [TableName in keyof DexieStarter]?: string[] }, // 'satisfies' detects renames of tables

      // Enable custom login GUI
      customLoginGui: true,

      // Require authentication
      requireAuth: {
        // allow magic email links to auto-login user
        email: query.email?.toString(),
        otpId: query.otpId?.toString(),
        otp: query.otp?.toString(),
      },
    })

    this.on('ready', async (vipDB) => {
      // Cast the Dexie to a DexieStarter using the following runtime check:
      if (!(vipDB instanceof DexieStarter)) throw new TypeError(`Impossible`) // For typings.
      // At this point as we know that an authenticated sync has been completed (due
      // to requireAuth option is set)
      // if db.card is empty, we're on a totally fresh new user.
      if ((await vipDB.cards.count()) === 0) {
        console.log('Populating the database with initial data')
        await vipDB.transaction('rw', vipDB.cards, async () => {
          if ((await vipDB.cards.count()) > 0) return
          await vipDB.cards.clear()
          const cardsToInsert = prepopulatedItems.map((cardItem) => {
            const cardToInsert: ICard = { ...cardItem }
            return cardToInsert
          })
          await vipDB.cards.bulkAdd(cardsToInsert)
        })
      }
    })
  }
}

export const createCard = async (card: ICard) => {
  return db.transaction('rw', db.cards, db.spaces, async (tx) => {
    if (card.spaceId) {
      const space = await tx.spaces.get(card.spaceId)
      if (!space) throw new TypeError(`Invlid spaceId: ${card.spaceId}`)
      if (space.realmId && space.realmId != db.cloud.currentUserId) {
        // The space is shared
        card.realmId = space.realmId
      }
    }
    await db.cards.add(card)
  })
}

export const updateCardTitle = async (id: string, title: string) => {
  await db.cards.where('id').equals(id).modify({ title: title })
}

export const deleteCard = async (id: string) => {
  await db.cards.delete(id)
}

export const createSpace = async (card: ISpace) => {
  await db.spaces.add(card)
}

export const useLiveDataSpaces = (id?: string): ISpaceList[] => {
  const spaces = useLiveQuery(async () => {
    try {
      const spaces = id
        ? await db.spaces.where('id').equals(id).toArray()
        : await db.spaces.limit(50).toArray()
      const cards = await db.cards.limit(10).toArray()
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
      if (!keyword) return await db.cards.limit(50).toArray()

      const keywords = extractLunrKeywords(keyword)
      if (keywords.length === 0) return []

      if (keywords.length === 1) {
        // One keyword search:
        const results = await db.cards
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
            db.cards.where('fullTextIndex').startsWith(keyWord).primaryKeys(),
          ),
        )
        // 2) Find the intersection of all primary keys
        const intersection = results.reduce((a, b) => {
          const set = new Set(b)
          return a.filter((k) => set.has(k))
        })
        // 3) Get the cards for the intersection (max 50 cards)
        return await db.cards.bulkGet(intersection.slice(0, 50))
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
  return await db.cards.get(id)
}

export const useLiveSpaceMembers = (space?: ISpaceList): DBRealmMember[] => {
  const members = useLiveQuery(async () => {
    if (!space?.realmId) return []

    const returnMembers = await db.members
      .where({ realmId: space.realmId })
      .toArray()

    return returnMembers
  }, [space?.realmId]) as DBRealmMember[]

  return members
}

export function shareSpaceList(space: ISpace, ...friends: DBRealmMember[]) {
  // Do a sync-consistent transaction that moves the space and its cards into a new realm
  // See http://dexie.org/cloud/docs/consistency
  return db.transaction(
    'rw',
    [db.cards, db.spaces, db.realms, db.members],
    () => {
      // Add or update a realm, tied to the todo-list using getTiedRealmId():
      const realmId = getTiedRealmId(space.id)

      // Create a realm for the shared space. Use put to not fail if it already exists.
      // (Sync consistency)
      db.realms.put({
        realmId,
        name: space.title,
        represents: 'A shared space of inspiration',
      })

      // Move the space into the realm:
      db.spaces.update(space.id, { realmId })

      // Sync consisently move all its cards into the realm:
      db.cards.where('spaceId').equals(space.id).modify({
        realmId,
      })

      // Add the members to share it to:
      if (friends.length > 0) {
        db.members.bulkAdd(
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
      }
    },
  )
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

export const db = new DexieStarter()
