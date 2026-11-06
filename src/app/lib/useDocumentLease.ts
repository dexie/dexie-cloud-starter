'use client'

import { useEffect, useState } from 'react'
import { Dexie } from 'dexie'
import type { DexieYProvider } from 'y-dexie'
import type { Doc } from 'yjs'

type LeaseResult = {
  doc: Doc
  signal: AbortSignal
} & (
  { provider: DexieYProvider; failed: false } | { error: unknown; failed: true }
)

/** Own exactly one provider reference per committed effect, never per render. */
export function useDocumentLease(
  doc: Doc | null | undefined,
): DexieYProvider | null {
  const [result, setResult] = useState<LeaseResult | null>(null)

  useEffect(() => {
    if (!doc) return

    // The grace period lets StrictMode's cleanup/setup replay reacquire the doc.
    // y-dexie registers this singleton when the app database imports its addon.
    const Provider = (
      Dexie as typeof Dexie & {
        DexieYProvider?: typeof import('y-dexie').DexieYProvider
      }
    ).DexieYProvider
    if (!Provider) throw new Error('The y-dexie addon has not been initialized')
    const provider = Provider.load(doc, { gracePeriod: 100 })
    const controller = new AbortController()
    // Local hydration, not Cloud sync: never expose an empty, still-loading doc.
    void provider.whenLoaded.then(
      () => {
        if (!controller.signal.aborted) {
          setResult({ doc, signal: controller.signal, provider, failed: false })
        }
      },
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setResult({ doc, signal: controller.signal, error, failed: true })
        }
      },
    )

    return () => {
      // Invalidate even a previously published result, including A -> B -> A.
      // Late hydration/rejection must neither publish state nor release twice.
      controller.abort()
      Provider.release(doc)
    }
  }, [doc])

  if (!result || result.doc !== doc || result.signal.aborted) return null
  if (result.failed) throw result.error
  return result.provider.destroyed ? null : result.provider
}
