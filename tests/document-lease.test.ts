import assert from 'node:assert/strict'
import { createRequire, register } from 'node:module'
import { pathToFileURL } from 'node:url'
import test, { after, before } from 'node:test'
import { act, Component, createElement, StrictMode, Suspense } from 'react'
import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import type { DexieYProvider as Provider } from 'y-dexie'
import { Dexie } from 'dexie'
import * as Y from 'yjs'
import { useDocumentLease } from '../src/app/lib/useDocumentLease'
import { useDocToHtml, htmlToDoc } from '../src/app/lib/docToHtml'

const require = createRequire(import.meta.url)
const originalIndexedDB = Dexie.dependencies.indexedDB
// liveQuery checks availability, but every actual storage operation is stubbed.
Dexie.dependencies.indexedDB = {} as IDBFactory
after(() => {
  Dexie.dependencies.indexedDB = originalIndexedDB
})

let DexieYProvider: typeof import('y-dexie').DexieYProvider
before(async () => {
  // The app aliases Yjs to one module in Next. Do the equivalent here: tsx
  // executes this package's .ts tests as CJS while y-dexie is ESM-only.
  // Resolve its Yjs import to the same real Yjs already used by the harness.
  register(
    'data:text/javascript,' +
      encodeURIComponent(
        'let yjs; export function initialize(data) { yjs = data.yjs } ' +
          'export function resolve(specifier, context, next) { ' +
          'return specifier === "yjs" ? { url: yjs, shortCircuit: true } : next(specifier, context) }',
      ),
    { data: { yjs: pathToFileURL(require.resolve('yjs')).href } },
  )
  DexieYProvider = (await import('y-dexie')).DexieYProvider
})

const { JSDOM } = require('jsdom') as {
  JSDOM: new (html: string) => { window: Window & typeof globalThis }
}
const dom = new JSDOM('<!doctype html><html><body></body></html>')
for (const name of ['window', 'document', 'navigator', 'Node', 'HTMLElement']) {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    value: Reflect.get(dom.window, name),
  })
}
Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', {
  configurable: true,
  value: true,
})
after(() => dom.window.close())

const pause = (ms = 15) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
type Update = { i: number; k: string; u: Uint8Array }

// Stub only the storage query interface. The provider, its liveQuery hydration,
// Y.Doc update observation, grace timers and refcounts are the installed code.
// This intentionally proves local ownership, not IndexedDB or Cloud sync.
function storedDoc(id: string, pending = false, update?: Uint8Array) {
  const loading = deferred<Update[]>()
  const rows = update ? [{ i: 1, k: id, u: update }] : []
  if (!pending) loading.resolve(rows)
  const doc = new Y.Doc()
  const updates = {
    where: () => ({ toArray: () => loading.promise }),
    add: () => Promise.resolve(2),
  }
  const parents = {
    where: () => ({
      equals: () => ({ toArray: () => Promise.resolve([{ id }]) }),
    }),
  }
  doc.meta = {
    db: { table: (name: string) => (name === 'updates' ? updates : parents) },
    parentTable: 'cards',
    updatesTable: 'updates',
    parentId: id,
  }
  return { doc, finish: () => loading.resolve(rows), fail: loading.reject }
}

function mounted(strict = false) {
  const root = createRoot(document.createElement('div'))
  const renders: {
    doc: Y.Doc | null | undefined
    provider: Provider | null
  }[] = []
  function Consumer({ doc }: { doc?: Y.Doc | null }) {
    const provider = useDocumentLease(doc)
    // Record every render, not just effects: catches the stale-provider frame.
    renders.push({ doc, provider })
    if (provider) assert.equal(provider.doc, doc)
    return null
  }
  return {
    renders,
    async show(docs: (Y.Doc | null | undefined)[]) {
      await act(async () => {
        const children = docs.map((doc, index) =>
          createElement(Consumer, { doc, key: index }),
        )
        root.render(
          strict ? createElement(StrictMode, null, ...children) : children,
        )
        await pause()
      })
      // liveQuery starts asynchronously after passive effects are committed.
      await act(async () => {
        await pause()
      })
    },
    async unmount() {
      await act(async () => root.unmount())
    },
  }
}

async function released(doc: Y.Doc, provider: Provider) {
  await pause(150)
  assert.equal(provider.destroyed, true)
  assert.equal(doc.isDestroyed, true)
  assert.equal(DexieYProvider.for(doc), undefined)
}

test('balanced lease keeps the actual provider alive across rerenders and StrictMode replay', async (t) => {
  for (const strict of [false, true]) {
    await t.test(strict ? 'StrictMode' : 'ordinary rerenders', async (t) => {
      const loads = t.mock.method(DexieYProvider, 'load')
      const releases = t.mock.method(DexieYProvider, 'release')
      const { doc } = storedDoc('rerender-' + strict)
      const view = mounted(strict)
      try {
        await view.show([doc])
        const provider = DexieYProvider.for(doc)!
        assert.ok(provider)
        assert.equal(provider.refCount, 1)
        assert.equal(loads.mock.callCount(), strict ? 2 : 1)
        assert.equal(releases.mock.callCount(), strict ? 1 : 0)
        for (let i = 0; i < 3; i++) await view.show([doc])
        await pause(150)
        assert.equal(provider.destroyed, false)
        assert.equal(provider.refCount, 1)
        assert.equal(view.renders.at(-1)?.provider, provider)
        assert.equal(loads.mock.callCount(), strict ? 2 : 1)
        assert.equal(releases.mock.callCount(), strict ? 1 : 0)
        await view.unmount()
        assert.equal(releases.mock.callCount(), loads.mock.callCount())
        assert.equal(provider.refCount, 0)
        await released(doc, provider)
      } finally {
        await view.unmount()
      }
    })
  }
})

test('two consumers own independent leases; one unmount cannot destroy the other', async () => {
  const { doc } = storedDoc('shared')
  const view = mounted()
  try {
    await view.show([doc, doc])
    const provider = DexieYProvider.for(doc)!
    assert.equal(provider.refCount, 2)
    assert.equal(view.renders.at(-1)?.provider, provider)
    await view.show([doc])
    assert.equal(provider.refCount, 1)
    await pause(150)
    assert.equal(provider.destroyed, false)
    await view.unmount()
    assert.equal(provider.refCount, 0)
    await released(doc, provider)
  } finally {
    await view.unmount()
  }
})

test('local hydration gates publication and document switches never expose the old provider', async () => {
  const source = new Y.Doc()
  source.getText('text').insert(0, 'from local storage')
  const a = storedDoc('a', false, Y.encodeStateAsUpdateV2(source))
  const b = storedDoc('b', true)
  const view = mounted()
  try {
    await view.show([a.doc])
    const pa = DexieYProvider.for(a.doc)!
    assert.equal(a.doc.getText('text').toString(), 'from local storage')
    assert.equal(view.renders.at(-1)?.provider, pa)
    await view.show([b.doc])
    const pb = DexieYProvider.for(b.doc)!
    assert.equal(pa.refCount, 0)
    assert.equal(pb.refCount, 1)
    assert.equal(view.renders.at(-1)?.provider, null)
    // Revisit A inside the grace period: a stale A result must not be reused
    // on the first render before the new A effect owns its reference.
    const start = view.renders.length
    await view.show([a.doc])
    assert.equal(view.renders[start].provider, null)
    assert.equal(view.renders.at(-1)?.provider, pa)
    assert.equal(pa.refCount, 1)
    assert.equal(pb.refCount, 0)
    await act(async () => {
      b.finish()
      await pause()
    })
    assert.equal(view.renders.at(-1)?.provider, pa)
    await released(b.doc, pb)
    await view.show([undefined])
    assert.equal(view.renders.at(-1)?.provider, null)
    assert.equal(pa.refCount, 0)
    await released(a.doc, pa)
  } finally {
    await view.unmount()
    source.destroy()
  }
})

test('unmount while hydration is pending balances once; late completion or rejection is ignored', async (t) => {
  for (const reject of [false, true]) {
    await t.test(reject ? 'late rejection' : 'late hydration', async (t) => {
      const loads = t.mock.method(DexieYProvider, 'load')
      const releases = t.mock.method(DexieYProvider, 'release')
      const storage = storedDoc('pending-' + reject, true)
      const view = mounted(true)
      await view.show([storage.doc])
      const provider = DexieYProvider.for(storage.doc)!
      assert.equal(view.renders.at(-1)?.provider, null)
      await view.unmount()
      const renderCount = view.renders.length
      if (reject) storage.fail(new Error('storage read failed'))
      else storage.finish()
      await pause()
      assert.equal(view.renders.length, renderCount)
      assert.equal(releases.mock.callCount(), loads.mock.callCount())
      assert.equal(provider.refCount, 0)
      await released(storage.doc, provider)
    })
  }
})

test('active hydration rejection reaches an error boundary and releases its lease', async () => {
  const storage = storedDoc('failed', true)
  const failure = new Error('local hydration failed')
  const caught: unknown[] = []
  const root = createRoot(document.createElement('div'), {
    onCaughtError: (error) => {
      caught.push(error)
    },
  })
  class Boundary extends Component<
    { children: ReactNode },
    { error: unknown }
  > {
    state = { error: null }
    static getDerivedStateFromError(error: unknown) {
      return { error }
    }
    render() {
      return this.state.error ? null : this.props.children
    }
  }
  function Consumer() {
    useDocumentLease(storage.doc)
    return null
  }
  try {
    await act(async () => {
      root.render(
        createElement(Boundary, { children: createElement(Consumer) }),
      )
    })
    await act(async () => {
      await pause()
    })
    const provider = DexieYProvider.for(storage.doc)!
    assert.equal(provider.refCount, 1)
    await act(async () => {
      storage.fail(failure)
      await pause()
    })
    assert.deepEqual(caught, [failure])
    assert.equal(provider.refCount, 0)
    await released(storage.doc, provider)
  } finally {
    await act(async () => root.unmount())
  }
})

test('render-only and suspended consumers never acquire a provider', async () => {
  const { doc } = storedDoc('uncommitted')
  function Consumer() {
    assert.equal(useDocumentLease(doc), null)
    return null
  }
  assert.equal(renderToString(createElement(Consumer)), '')
  assert.equal(DexieYProvider.for(doc), undefined)
  const forever = new Promise<void>(() => {})
  function Suspended(): ReactNode {
    useDocumentLease(doc)
    throw forever
  }
  const root = createRoot(document.createElement('div'))
  await act(async () => {
    root.render(
      createElement(Suspense, { fallback: null }, createElement(Suspended)),
    )
  })
  assert.equal(DexieYProvider.for(doc), undefined)
  await act(async () => root.unmount())
  doc.destroy()
})

test('HTML preview owns a balanced lease and rerenders only after local hydration', async () => {
  const source = htmlToDoc('<p>Hydrated preview</p>')
  const storage = storedDoc('preview', true, Y.encodeStateAsUpdateV2(source))
  const root = createRoot(document.createElement('div'))
  const html: string[] = []
  function Preview() {
    html.push(useDocToHtml(storage.doc))
    return null
  }
  try {
    await act(async () => {
      root.render(createElement(StrictMode, null, createElement(Preview)))
    })
    await act(async () => {
      await pause()
    })
    assert.equal(html.at(-1), '')
    const provider = DexieYProvider.for(storage.doc)!
    await act(async () => {
      storage.finish()
      await pause()
    })
    assert.equal(html.at(-1), '<p>Hydrated preview</p>')
    assert.equal(provider.refCount, 1)
    await act(async () => root.unmount())
    assert.equal(provider.refCount, 0)
    await released(storage.doc, provider)
  } finally {
    await act(async () => root.unmount())
    source.destroy()
  }
})
