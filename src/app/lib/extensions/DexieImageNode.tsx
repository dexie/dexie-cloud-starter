'use client'

import Image from '@tiptap/extension-image'
import {
  ReactNodeViewRenderer,
  NodeViewProps,
  NodeViewWrapper,
} from '@tiptap/react'
import React, { useEffect, useState } from 'react'
import { db } from '@/app/db/db'

/**
 * DexieImageNode:
 * Ärver från Tiptaps standard-image, men ersätter "addNodeView"
 * så att vi kan rendera bilder från Dexie via React.
 */
export const DexieImageNode = Image.extend({
  // Se till att node-namnet förblir "image" så
  // ex. ImageResize-extension känner igen den.
  name: 'image',

  addNodeView() {
    return ReactNodeViewRenderer(DexieImageComponent)
  },
})

/**
 * DexieImageComponent:
 * NodeView i React som visar antingen en external/base64-länk,
 * eller om src är "dexie://<id>", så laddas bilden från Dexie och
 * visas med en blob:URL enbart i DOM (ej i doc).
 */
function DexieImageComponent(props: NodeViewProps) {
  const { node, selected } = props
  const [blobUrl, setBlobUrl] = useState<string | null>(null)

  useEffect(() => {
    let urlToRevoke: string | null = null

    async function loadImage() {
      const src = node.attrs.src as string
      if (!src) {
        setBlobUrl(null)
        return
      }

      // Kolla om vi använder "dexie://<imageId>"
      if (src.startsWith('dexie://')) {
        const imageId = src.replace('dexie://', '')
        try {
          const data = await db.image.get(imageId)
          if (data?.file) {
            const newBlobUrl = URL.createObjectURL(data.file)
            setBlobUrl(newBlobUrl)
            urlToRevoke = newBlobUrl
          } else {
            // Om bilden saknas i DB, visa tom
            setBlobUrl('')
          }
        } catch (err) {
          console.error('Failed to load Dexie image:', err)
          setBlobUrl('')
        }
      } else {
        // Annars exv. base64 eller http-länk
        setBlobUrl(src)
      }
    }

    loadImage()

    // Rensa upp ev. tidigare blobURL när noden avmonteras
    return () => {
      if (urlToRevoke) {
        URL.revokeObjectURL(urlToRevoke)
      }
    }
  }, [node])

  // Om blobUrl är null → loading, du kan välja att visa en spinner
  // Om blobUrl är tom sträng → problem, ex. Dexie-bild hittades ej
  const isLoading = blobUrl === null
  const hasErrorOrNotFound = blobUrl === ''

  return (
    <NodeViewWrapper /* valfri className eller styling här */>
      <img
        src={isLoading ? '' : hasErrorOrNotFound ? '' : blobUrl}
        alt={node.attrs.alt || ''}
        title={node.attrs.title || ''}
        style={{
          maxWidth: '100%',
          outline: selected ? '2px solid #2196f3' : 'none',
          opacity: isLoading ? 0.5 : 1,
        }}
      />
    </NodeViewWrapper>
  )
}
