'use client'

import React, { useRef, useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { CardContent } from '@mui/material'
import { styled } from '@mui/material/styles'
import { ICard, db } from '../db/db' // Importera Dexie-databasen
import Avatars from './Avatars'
import { Box } from '@mui/system'

export const HEIGHT_THRESHOLD = 500 // px
export const FIXED_HEIGHT = 200 // px

export const ContentCard = styled('div')<{ isScaled: boolean }>(
  ({ isScaled }) => ({
    height: isScaled ? `${FIXED_HEIGHT}px` : 'auto',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '3px 10px 37px -4px rgba(42, 52, 68, 0.5)',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s, height 0.3s',
    overflow: isScaled ? 'hidden' : 'visible',
    position: 'relative',
    borderRadius: '6px',
    '&:hover': {
      transform: 'scale(1.02)',
      boxShadow: '4px 12px 40px -4px rgba(42, 52, 68, 0.6)',
      outline: '2px solid gray',
    },
    '&:focus': {
      outline: '2px solid gray',
    },
  }),
)

export const ContentWrapper = styled('div')<{ scaleFactor: number }>(
  ({ scaleFactor }) => ({
    zoom: scaleFactor < 1 ? '0.5' : '1',
    transition: 'zoom 0.3s',
    width: '100%',
    overflowX: 'hidden',
  }),
)

interface ItemCardProps {
  item: ICard
}

const ItemCard: React.FC<ItemCardProps> = ({ item }) => {
  const router = useRouter()
  const pathname = usePathname()
  const isOnEverythingPage = pathname.startsWith('/everything')

  const contentRef = useRef<HTMLDivElement>(null)
  const [isScaled, setIsScaled] = useState(false)
  const [scaleFactor, setScaleFactor] = useState(1)

  // Här lagrar vi den uppdaterade HTML-strängen med blob-URL:er
  const [processedHtml, setProcessedHtml] = useState(item.docHtml || '')

  const handleClick = () => {
    router.push(`?edit=${item.id}`)
  }

  // Höjdberäkning + ev. scaling
  useEffect(() => {
    if (contentRef.current) {
      const contentHeight = contentRef.current.scrollHeight
      if (contentHeight > HEIGHT_THRESHOLD) {
        const newScaleFactor = FIXED_HEIGHT / contentHeight
        setScaleFactor(newScaleFactor < 1 ? newScaleFactor : 1)
        setIsScaled(newScaleFactor < 1)
      } else {
        setScaleFactor(1)
        setIsScaled(false)
      }
    }
  }, [item.description])

  // Ersätt `dexie://<id>` med blob-URL:er från Dexie
  useEffect(() => {
    const replaceDexieUrls = async () => {
      if (!item.docHtml) return

      // Hitta alla "dexie://<id>" i HTML-strängen
      const dexieUrls = item.docHtml.match(/dexie:\/\/[a-f0-9-]+/g) || []

      if (dexieUrls.length === 0) {
        setProcessedHtml(item.docHtml) // Om inga Dexie-URL:er finns, använd originaltexten
        return
      }

      // Hämta bilder från Dexie och skapa blob-URL:er
      const urlMap: { [key: string]: string } = {}

      for (const dexieUrl of dexieUrls) {
        const imageId = dexieUrl.replace('dexie://', '')
        try {
          const imageData = await db.image.get(imageId)
          if (imageData?.file) {
            const blobUrl = URL.createObjectURL(imageData.file)
            urlMap[dexieUrl] = blobUrl
          } else {
            urlMap[dexieUrl] = '' // Om bilden saknas, ersätt med tom sträng
          }
        } catch (error) {
          console.error(`Kunde inte ladda Dexie-bild: ${dexieUrl}`, error)
          urlMap[dexieUrl] = ''
        }
      }

      // Ersätt alla "dexie://<id>" i HTML-strängen med deras blob-URL
      let updatedHtml = item.docHtml
      for (const [dexieUrl, blobUrl] of Object.entries(urlMap)) {
        updatedHtml = updatedHtml.replaceAll(dexieUrl, blobUrl)
      }

      setProcessedHtml(updatedHtml)
    }

    replaceDexieUrls()

    return () => {
      // Rensa blob-URL:er från minnet när komponenten avmonteras
      Object.values(processedHtml).forEach((url) => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url)
        }
      })
    }
  }, [item.docHtml])

  return (
    <ContentCard
      onClick={handleClick}
      isScaled={isScaled}
      tabIndex={0}
      aria-label={`Edit item ${item.id}`}
    >
      {isOnEverythingPage && (
        <Box sx={{ position: 'absolute', right: 10, top: 10 }}>
          <Avatars realmId={item.realmId as string} compact />
        </Box>
      )}
      <ContentWrapper scaleFactor={scaleFactor}>
        <div ref={contentRef}>
          <CardContent>
            <div
              className="editor-content"
              dangerouslySetInnerHTML={{
                __html: processedHtml, // Använd den uppdaterade HTML-strängen med blob-URL:er
              }}
            />
          </CardContent>
        </div>
      </ContentWrapper>
      {isScaled && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            height: '50px',
            background: 'linear-gradient(to top, white, transparent)',
          }}
        />
      )}
    </ContentCard>
  )
}

export default ItemCard
