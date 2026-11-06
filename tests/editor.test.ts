import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import test, { after } from 'node:test'
import { Editor, getSchema } from '@tiptap/core'
import { useEditor, EditorContent } from '@tiptap/react'
import { act, createElement, StrictMode, useEffect, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCaret from '@tiptap/extension-collaboration-caret'
import { Awareness } from 'y-protocols/awareness'
import { yDocToProsemirrorJSON } from '@tiptap/y-tiptap'
import * as Y from 'yjs'
import {
  commonTiptapExtensions,
  editorTiptapExtensions,
  tiptapFragmentName,
} from '../src/app/lib/common-tiptap-extensions'
import { docToHtml, htmlToDoc } from '../src/app/lib/docToHtml'

const require = createRequire(import.meta.url)
// jsdom is test-only: no DOM emulator belongs in the client editor bundle.
const { JSDOM } = require('jsdom') as {
  JSDOM: new (
    html: string,
    options: object,
  ) => { window: Window & typeof globalThis }
}
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  pretendToBeVisual: true,
})
for (const name of [
  'window',
  'document',
  'navigator',
  'Node',
  'HTMLElement',
  'Element',
  'MutationObserver',
  'DOMParser',
  'getComputedStyle',
  'requestAnimationFrame',
  'cancelAnimationFrame',
]) {
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

function collaborativeEditor(doc: Y.Doc, awareness?: Awareness) {
  return new Editor({
    element: document.createElement('div'),
    enableContentCheck: true,
    extensions: [
      ...editorTiptapExtensions,
      Collaboration.configure({ document: doc, field: tiptapFragmentName }),
      ...(awareness
        ? [CollaborationCaret.configure({ provider: { awareness } })]
        : []),
    ],
  })
}

test('HTML/Y.Doc roundtrip keeps default fragment, old image node name and common schema', () => {
  const doc = htmlToDoc(
    '<h2>Hello <strong>world</strong></h2><blockquote><p>Quoted</p></blockquote>' +
      '<pre><code class="language-javascript">const x = 1</code></pre>' +
      '<img src="data:image/png;base64,YQ==" alt="old image" title="caption" width="240" height="120">',
  )
  let copy: Y.Doc | undefined
  try {
    assert.equal(tiptapFragmentName, 'default')
    assert.equal(doc.getXmlFragment('default').length, 4)
    const json = yDocToProsemirrorJSON(doc, 'default')
    assert.equal(
      getSchema(commonTiptapExtensions).nodeFromJSON(json).child(3).type.name,
      'image',
    )
    const html = docToHtml(doc)
    const parsed = new DOMParser().parseFromString(html, 'text/html')
    assert.equal(parsed.querySelector('h2 strong')?.textContent, 'world')
    assert.equal(parsed.querySelector('blockquote p')?.textContent, 'Quoted')
    assert.equal(parsed.querySelector('pre code')?.textContent, 'const x = 1')
    assert.equal(
      parsed.querySelector('img')?.getAttribute('src'),
      'data:image/png;base64,YQ==',
    )
    assert.equal(parsed.querySelector('img')?.getAttribute('alt'), 'old image')
    assert.equal(parsed.querySelector('img')?.getAttribute('width'), '240')
    assert.equal(parsed.querySelector('[data-resize-container]'), null)
    copy = htmlToDoc(html)
    assert.deepEqual(yDocToProsemirrorJSON(copy, 'default'), json)
    const schema = getSchema(commonTiptapExtensions)
    const editorSchema = getSchema(editorTiptapExtensions)
    assert.deepEqual(Object.keys(editorSchema.nodes), Object.keys(schema.nodes))
    assert.deepEqual(Object.keys(editorSchema.marks), Object.keys(schema.marks))
    assert.deepEqual(
      editorSchema.nodes.image.spec.attrs,
      schema.nodes.image.spec.attrs,
    )
  } finally {
    doc.destroy()
    copy?.destroy()
  }
})

test('legacy Yjs image style survives opening, export, edits and native resize without arbitrary CSS', () => {
  const doc = new Y.Doc()
  const image = new Y.XmlElement('image')
  const style = 'width: 240px; height: auto; margin: 0 auto; display: block;'
  image.setAttribute('src', 'data:image/png;base64,YQ==')
  image.setAttribute('style', style)
  const paragraph = new Y.XmlElement('paragraph')
  const text = new Y.XmlText()
  text.insert(0, 'Text')
  paragraph.insert(0, [text])
  doc.getXmlFragment('default').insert(0, [paragraph, image])
  const peerDoc = new Y.Doc()
  Y.applyUpdateV2(peerDoc, Y.encodeStateAsUpdateV2(doc))
  const editor = collaborativeEditor(doc)
  const peer = collaborativeEditor(peerDoc)
  const forward = (update: Uint8Array) => Y.applyUpdateV2(peerDoc, update)
  doc.on('updateV2', forward)
  try {
    assert.equal(editor.state.doc.child(1).attrs.style, style)
    const beforeExport = Y.encodeStateAsUpdateV2(doc)
    const exported = new DOMParser().parseFromString(
      docToHtml(doc),
      'text/html',
    )
    assert.equal(exported.querySelector('img')?.style.width, '240px')
    assert.equal(exported.querySelector('img')?.style.margin, '0px auto')
    assert.deepEqual(Y.encodeStateAsUpdateV2(doc), beforeExport)
    assert.equal(editor.view.dom.querySelector('img')?.style.width, '240px')
    editor.commands.insertContentAt(1, 'Unrelated')
    assert.equal(image.getAttribute('style'), style)
    editor
      .chain()
      .setNodeSelection(editor.state.doc.firstChild!.nodeSize)
      .updateAttributes('image', { width: 320, height: 160 })
      .run()
    assert.equal(image.getAttribute('style'), style)
    assert.equal(
      (peerDoc.getXmlFragment('default').get(1) as Y.XmlElement).getAttribute(
        'style',
      ),
      style,
    )
    assert.deepEqual(editor.getJSON(), peer.getJSON())
    const resized = new DOMParser()
      .parseFromString(docToHtml(doc), 'text/html')
      .querySelector('img')!
    assert.equal(resized.style.width, '320px')
    assert.equal(resized.style.height, '160px')
    assert.equal(resized.style.margin, '0px auto')
    assert.equal(editor.view.dom.querySelector('img')?.style.width, '320px')
    // Existing Yjs attrs bypass HTML parsing: render must sanitize as well.
    editor.commands.updateAttributes('image', {
      style:
        'width: 25%; height: auto; margin: 0 0 0 auto; position: fixed; background: url(https://invalid.test/); width: expression(alert(1)); color: red !important;',
    })
    for (const html of [editor.getHTML(), docToHtml(doc)]) {
      assert.doesNotMatch(
        html,
        /position|background|invalid.test|expression|important/,
      )
      assert.equal(
        new DOMParser().parseFromString(html, 'text/html').querySelector('img')
          ?.style.marginLeft,
        'auto',
      )
    }
    const imported = htmlToDoc(
      '<img src="data:image/png;base64,YQ==" style="width: 25%; margin: 0 auto; position: fixed; background: url(https://invalid.test/)">',
    )
    try {
      const firstChild = yDocToProsemirrorJSON(imported, 'default').content?.[0]
      assert.ok(firstChild && !Array.isArray(firstChild))
      assert.equal(firstChild.attrs?.style, 'width: 25%; margin: 0 auto;')
    } finally {
      imported.destroy()
    }
  } finally {
    doc.off('updateV2', forward)
    editor.destroy()
    peer.destroy()
    doc.destroy()
    peerDoc.destroy()
  }
})

test('Node ESM selects the server HTML renderer without a browser global', () => {
  const result = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '--eval',
      `
    import assert from 'node:assert/strict'
    import { generateHTML, generateJSON } from '@tiptap/html'
    import StarterKit from '@tiptap/starter-kit'
    import Image from '@tiptap/extension-image'
    assert.equal(typeof window, 'undefined')
    const extensions = [StarterKit.configure({undoRedo: false}), Image.configure({allowBase64: true})]
    const html = '<p>Server</p><img src="data:image/png;base64,YQ==" width="240">'
    const json = generateJSON(html, extensions)
    assert.equal(json.content[1].type, 'image')
    assert.match(generateHTML(json, extensions), /width="240"/)
    assert.equal(typeof window, 'undefined')
  `,
    ],
    { encoding: 'utf8', timeout: 15_000 },
  )
  assert.equal(result.status, 0, result.stderr)
})

test('native image resize is editor-only; StarterKit extensions are unique and Yjs owns undo', () => {
  const doc = htmlToDoc('<p>Existing</p><img src="data:image/png;base64,YQ==">')
  const editor = collaborativeEditor(doc)
  try {
    const names = editor.extensionManager.extensions.map(
      (extension) => extension.name,
    )
    assert.equal(new Set(names).size, names.length)
    assert.equal(names.includes('undoRedo'), false)
    assert.equal(names.filter((name) => name === 'blockquote').length, 1)
    assert.equal(names.filter((name) => name === 'codeBlock').length, 1)
    assert.equal(names.filter((name) => name === 'link').length, 1)
    assert.equal(names.filter((name) => name === 'underline').length, 1)
    assert.deepEqual(
      editorTiptapExtensions.find((extension) => extension.name === 'image')
        ?.options.resize,
      { enabled: true, alwaysPreserveAspectRatio: true },
    )
    const image = commonTiptapExtensions.find(
      (extension) => extension.name === 'image',
    )
    assert.ok(image && 'resize' in image.options)
    assert.equal(image.options.resize, false)
    assert.equal(editor.can().undo(), false)
    assert.equal(editor.can().redo(), false)
    assert.match(editor.getHTML(), /Existing/)
    assert.equal(editor.state.doc.child(1).type.name, 'image')
  } finally {
    editor.destroy()
    assert.equal(doc.isDestroyed, false)
    doc.destroy()
  }
})

test('Tiptap 3 bindings converge over Yjs V2 updates; local undo preserves remote text and resize attrs', () => {
  const aDoc = htmlToDoc('<p>Start </p><img src="data:image/png;base64,YQ==">')
  const bDoc = new Y.Doc()
  Y.applyUpdateV2(bDoc, Y.encodeStateAsUpdateV2(aDoc))
  const a = collaborativeEditor(aDoc)
  const b = collaborativeEditor(bDoc)
  // The same origin boundary as database/provider replay, without opening any DB.
  const remote = { source: 'provider-replay' }
  const forwardA = (update: Uint8Array, origin: unknown) => {
    if (origin !== remote) Y.applyUpdateV2(bDoc, update, remote)
  }
  const forwardB = (update: Uint8Array, origin: unknown) => {
    if (origin !== remote) Y.applyUpdateV2(aDoc, update, remote)
  }
  aDoc.on('updateV2', forwardA)
  bDoc.on('updateV2', forwardB)
  try {
    assert.equal(a.commands.insertContentAt(1, 'Alice '), true)
    assert.equal(
      b.commands.insertContentAt(b.state.doc.firstChild!.nodeSize - 1, 'Bob'),
      true,
    )
    assert.deepEqual(a.getJSON(), b.getJSON())
    assert.equal(a.commands.undo(), true)
    assert.equal(a.getText().includes('Alice'), false)
    assert.equal(a.getText().includes('Bob'), true)
    assert.deepEqual(a.getJSON(), b.getJSON())
    assert.equal(a.commands.redo(), true)
    assert.equal(a.getText().includes('Alice'), true)
    assert.deepEqual(a.getJSON(), b.getJSON())
    // Native resize commits these attrs through a normal public transaction.
    const imagePos = b.state.doc.firstChild!.nodeSize
    assert.equal(
      b
        .chain()
        .setNodeSelection(imagePos)
        .updateAttributes('image', { width: 320, height: 160 })
        .run(),
      true,
    )
    assert.equal(a.state.doc.child(1).attrs.width, 320)
    assert.equal(a.state.doc.child(1).attrs.height, 160)
    assert.deepEqual(a.getJSON(), b.getJSON())
    assert.match(docToHtml(aDoc), /width="320"/)
  } finally {
    aDoc.off('updateV2', forwardA)
    bDoc.off('updateV2', forwardB)
    a.destroy()
    b.destroy()
    aDoc.destroy()
    bDoc.destroy()
  }
})

test('Caret uses supplied Awareness and teardown/remount does not destroy the shared provider state', () => {
  const doc = htmlToDoc('<p>Shared</p>')
  const awareness = new Awareness(doc)
  const baseline = awareness._observers.get('update')?.size || 0
  let editor: Editor | undefined
  try {
    for (let i = 0; i < 3; i++) {
      editor = collaborativeEditor(doc, awareness)
      editor.commands.updateUser({ name: 'Alice', color: '#123456' })
      assert.deepEqual(awareness.getLocalState()?.user, {
        name: 'Alice',
        color: '#123456',
      })
      assert.equal(editor.commands.insertContentAt(1, 'x'), true)
      editor.destroy()
      editor = undefined
      assert.equal(awareness._observers.get('update')?.size || 0, baseline)
      assert.equal(doc.isDestroyed, false)
      assert.ok(awareness.getLocalState())
    }
    assert.equal(
      getSchema(commonTiptapExtensions).nodeFromJSON(
        yDocToProsemirrorJSON(doc, 'default'),
      ).textContent,
      'xxxShared',
    )
  } finally {
    editor?.destroy()
    awareness.destroy()
    doc.destroy()
  }
})

type ControlledRead = { finish: (src: string) => void; aborted: boolean }
const controlledReads: ControlledRead[] = []
const controlledDecodes: Array<() => void> = []

function mockImageIO(holdDecode = false) {
  const originalReader = Object.getOwnPropertyDescriptor(
    globalThis,
    'FileReader',
  )
  const originalImage = Object.getOwnPropertyDescriptor(globalThis, 'Image')
  controlledReads.length = 0
  controlledDecodes.length = 0
  class Reader {
    result: string | null = null
    error = null
    onload?: () => void
    onerror?: () => void
    onabort?: () => void
    control: ControlledRead = {
      finish: (src) => {
        this.result = src
        this.onload?.()
      },
      aborted: false,
    }
    readAsDataURL() {
      controlledReads.push(this.control)
    }
    abort() {
      this.control.aborted = true
      this.onabort?.()
    }
  }
  class DecodedImage {
    width = 10
    height = 10
    onload?: () => void
    set src(_value: string) {
      if (holdDecode) controlledDecodes.push(() => this.onload?.())
      else queueMicrotask(() => this.onload?.())
    }
  }
  Object.defineProperty(globalThis, 'FileReader', {
    configurable: true,
    value: Reader,
  })
  Object.defineProperty(globalThis, 'Image', {
    configurable: true,
    value: DecodedImage,
  })
  return () => {
    if (originalReader)
      Object.defineProperty(globalThis, 'FileReader', originalReader)
    else Reflect.deleteProperty(globalThis, 'FileReader')
    if (originalImage) Object.defineProperty(globalThis, 'Image', originalImage)
    else Reflect.deleteProperty(globalThis, 'Image')
  }
}

function transfer(files: File[], text = '', itemsOnly = false): DataTransfer {
  return {
    files: itemsOnly ? [] : files,
    items: files.map((file) => ({
      kind: 'file',
      type: file.type,
      getAsFile: () => file,
    })),
    getData: (format: string) => (format === 'text/plain' ? text : ''),
  } as unknown as DataTransfer
}

function paste(editor: Editor, data: DataTransfer) {
  const event = new dom.window.Event('paste', { cancelable: true })
  Object.defineProperty(event, 'clipboardData', { value: data })
  let handled = false
  editor.view.someProp('handleDOMEvents', (handlers) => {
    handled = Boolean(handlers.paste?.(editor.view, event as ClipboardEvent))
    return handled
  })
  return { handled, prevented: event.defaultPrevented }
}

const settleUploads = () =>
  new Promise<void>((resolve) => setImmediate(resolve))

test('paste leaves ordinary text/non-image/mixed transfers untouched and supports image clipboard items', async () => {
  const restore = mockImageIO()
  const doc = htmlToDoc('<p>Text</p>')
  const editor = collaborativeEditor(doc)
  try {
    const image = new dom.window.File(['x'], 'image.png', { type: 'image/png' })
    const pdf = new dom.window.File(['x'], 'document.pdf', {
      type: 'application/pdf',
    })
    for (const data of [
      transfer([], 'ordinary text'),
      transfer([pdf]),
      transfer([image, pdf]),
      transfer([image], 'text plus image'),
    ]) {
      assert.deepEqual(paste(editor, data), {
        handled: false,
        prevented: false,
      })
    }
    assert.equal(controlledReads.length, 0)
    assert.deepEqual(paste(editor, transfer([image], '', true)), {
      handled: true,
      prevented: true,
    })
    assert.equal(controlledReads.length, 1)
    controlledReads[0].finish('data:image/png;base64,YQ==')
    await settleUploads()
    assert.equal(
      editor.getJSON().content?.some((node) => node.type === 'image'),
      true,
    )
  } finally {
    editor.destroy()
    doc.destroy()
    restore()
  }
})

test('async image paste preserves file order and maps its original target through intervening edits', async () => {
  const restore = mockImageIO()
  const doc = htmlToDoc('<p>Before</p><p>After</p>')
  const editor = collaborativeEditor(doc)
  try {
    editor.commands.setTextSelection(1)
    const files = ['first', 'second'].map(
      (name) => new dom.window.File(['x'], name, { type: 'image/png' }),
    )
    assert.equal(paste(editor, transfer(files)).handled, true)
    editor.commands.insertContentAt(1, 'prefix ')
    editor.commands.setTextSelection(editor.state.doc.content.size - 1)
    controlledReads[1].finish('data:image/png;base64,c2Vjb25k')
    await settleUploads()
    assert.equal(
      editor.getJSON().content?.some((node) => node.type === 'image'),
      false,
    )
    controlledReads[0].finish('data:image/png;base64,Zmlyc3Q=')
    await settleUploads()
    const content = editor.getJSON().content!
    const imageIndex = content.findIndex((node) => node.type === 'image')
    assert.equal(
      content[imageIndex].attrs?.src,
      'data:image/png;base64,Zmlyc3Q=',
    )
    assert.equal(
      content[imageIndex + 1].attrs?.src,
      'data:image/png;base64,c2Vjb25k',
    )
    assert.equal(editor.state.doc.child(imageIndex - 1).textContent, 'prefix ')
    assert.equal(editor.state.doc.child(imageIndex + 2).textContent, 'Before')
    assert.equal(editor.state.doc.lastChild?.textContent, 'After')
  } finally {
    editor.destroy()
    doc.destroy()
    restore()
  }
})

test('remote two-Y.Doc paragraph replacement during image decode cancels upload instead of inserting at a collapsed target', async () => {
  const restore = mockImageIO(true)
  const doc = htmlToDoc('<p>Before target after</p><p>Other</p>')
  const peerDoc = new Y.Doc()
  Y.applyUpdateV2(peerDoc, Y.encodeStateAsUpdateV2(doc))
  const editor = collaborativeEditor(doc)
  const peer = collaborativeEditor(peerDoc)
  const remote = { source: 'peer' }
  const forward = (update: Uint8Array) => Y.applyUpdateV2(doc, update, remote)
  peerDoc.on('updateV2', forward)
  try {
    editor.commands.setTextSelection({ from: 8, to: 14 })
    const bookmark = editor.state.selection.getBookmark()
    const image = new dom.window.File(['x'], 'image.png', { type: 'image/png' })
    assert.equal(paste(editor, transfer([image])).handled, true)
    controlledReads[0].finish('data:image/png;base64,YQ==')
    await settleUploads()
    assert.equal(controlledDecodes.length, 1, 'decode is still pending')
    let collapsed = false
    editor.on('transaction', ({ transaction }) => {
      if (transaction.docChanged) {
        const mapped = bookmark
          .map(transaction.mapping)
          .resolve(transaction.doc)
        collapsed = mapped.empty
      }
    })
    // A normal peer text edit makes this binding replace the changed paragraph.
    peer.commands.insertContentAt(1, 'Remote ')
    assert.equal(
      collapsed,
      true,
      'reproduces incompatible numeric bookmark mapping',
    )
    assert.deepEqual(editor.getJSON(), peer.getJSON())
    const beforeDecode = editor.getJSON()
    const beforeUpdate = Y.encodeStateAsUpdateV2(doc)
    controlledDecodes[0]()
    await settleUploads()
    assert.deepEqual(editor.getJSON(), beforeDecode)
    assert.deepEqual(Y.encodeStateAsUpdateV2(doc), beforeUpdate)
    assert.equal(
      editor.getJSON().content?.some((node) => node.type === 'image'),
      false,
    )
    assert.equal(editor.getText(), 'Remote Before target after\n\nOther')
  } finally {
    peerDoc.off('updateV2', forward)
    editor.destroy()
    peer.destroy()
    doc.destroy()
    peerDoc.destroy()
    restore()
  }
})

test('pending image reads are canceled and cannot dispatch after editor destruction', async () => {
  const restore = mockImageIO()
  const doc = htmlToDoc('<p>Before</p>')
  const editor = collaborativeEditor(doc)
  try {
    const image = new dom.window.File(['x'], 'image.png', { type: 'image/png' })
    assert.equal(paste(editor, transfer([image])).handled, true)
    editor.destroy()
    assert.equal(controlledReads[0].aborted, true)
    const before = Y.encodeStateAsUpdateV2(doc)
    // Simulate even a late browser callback despite cancellation.
    controlledReads[0].finish('data:image/png;base64,YQ==')
    await settleUploads()
    assert.deepEqual(Y.encodeStateAsUpdateV2(doc), before)
    assert.equal(doc.isDestroyed, false)
  } finally {
    editor.destroy()
    doc.destroy()
    restore()
  }
})

test('image drop uses the drop position rather than current selection; non-images remain unhandled', async () => {
  const restore = mockImageIO()
  const doc = htmlToDoc('<p>Before</p><p>After</p>')
  const editor = collaborativeEditor(doc)
  const originalCoords = editor.view.posAtCoords
  editor.view.posAtCoords = () => ({ pos: 1, inside: -1 })
  const drop = (data: DataTransfer) => {
    const event = new dom.window.Event('drop', { cancelable: true })
    Object.defineProperties(event, {
      dataTransfer: { value: data },
      clientX: { value: 10 },
      clientY: { value: 20 },
    })
    let handled = false
    editor.view.someProp('handleDOMEvents', (handlers) => {
      handled = Boolean(handlers.drop?.(editor.view, event as DragEvent))
      return handled
    })
    return { handled, prevented: event.defaultPrevented }
  }
  try {
    editor.commands.setTextSelection(editor.state.doc.content.size - 1)
    const pdf = new dom.window.File(['x'], 'document.pdf', {
      type: 'application/pdf',
    })
    assert.deepEqual(drop(transfer([pdf])), {
      handled: false,
      prevented: false,
    })
    const image = new dom.window.File(['x'], 'image.png', { type: 'image/png' })
    assert.deepEqual(drop(transfer([image])), {
      handled: true,
      prevented: true,
    })
    controlledReads[0].finish('data:image/png;base64,YQ==')
    await settleUploads()
    assert.equal(editor.state.doc.firstChild?.type.name, 'image')
    assert.equal(editor.state.doc.lastChild?.textContent, 'After')
  } finally {
    editor.view.posAtCoords = originalCoords
    editor.destroy()
    doc.destroy()
    restore()
  }
})

test('React 19 StrictMode useEditor lifecycle preserves the shared doc and profile updates preserve undo', async () => {
  const doc = htmlToDoc('<p>Shared</p>')
  const awareness = new Awareness(doc)
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const editorRef: { current: Editor | null } = { current: null }
  function Harness({ name }: { name: string }) {
    const extensions = useMemo(
      () => [
        ...editorTiptapExtensions,
        Collaboration.configure({ document: doc, field: 'default' }),
        CollaborationCaret.configure({ provider: { awareness } }),
      ],
      [],
    )
    const editor = useEditor({ immediatelyRender: false, extensions }, [
      extensions,
    ])
    useEffect(() => {
      editorRef.current = editor
      return () => {
        if (editorRef.current === editor) editorRef.current = null
      }
    }, [editor])
    useEffect(() => {
      editor?.commands.updateUser({ name, color: '#123456' })
    }, [editor, name])
    return createElement(EditorContent, { editor })
  }
  let unmounted = false
  try {
    await act(async () => {
      root.render(
        createElement(
          StrictMode,
          null,
          createElement(Harness, { name: 'Alice' }),
        ),
      )
    })
    const first = editorRef.current
    assert.ok(first)
    await act(async () => {
      first.commands.insertContentAt(1, 'local ')
    })
    assert.equal(first.can().undo(), true)
    await act(async () => {
      root.render(
        createElement(
          StrictMode,
          null,
          createElement(Harness, { name: 'Updated' }),
        ),
      )
    })
    assert.equal(editorRef.current, first)
    assert.equal(awareness.getLocalState()?.user.name, 'Updated')
    assert.equal(first.can().undo(), true)
    await act(async () => {
      root.unmount()
    })
    unmounted = true
    await new Promise((resolve) => setTimeout(resolve, 10))
    assert.equal(editorRef.current, null)
    assert.equal(first.isDestroyed, true)
    assert.equal(doc.isDestroyed, false)
    assert.ok(awareness.getLocalState())
  } finally {
    if (!unmounted)
      await act(async () => {
        root.unmount()
      })
    awareness.destroy()
    doc.destroy()
    container.remove()
  }
})

test('content checking preserves unknown shared nodes rather than syncing destructive repairs', () => {
  const doc = htmlToDoc('<p>Known</p>')
  const unknown = new Y.XmlElement('futureWidget')
  doc.getXmlFragment('default').push([unknown])
  const before = doc.getXmlFragment('default').toString()
  let errors = 0
  const editor = new Editor({
    element: document.createElement('div'),
    enableContentCheck: true,
    extensions: [
      ...editorTiptapExtensions,
      Collaboration.configure({ document: doc, field: 'default' }),
    ],
    onContentError({ editor }) {
      errors++
      editor.setEditable(false)
    },
  })
  try {
    assert.ok(errors > 0)
    assert.equal(doc.getXmlFragment('default').toString(), before)
    assert.equal(doc.isDestroyed, false)
    assert.equal(editor.isEditable, false)
    assert.equal(editor.commands.undo(), false)
  } finally {
    editor.destroy()
    doc.destroy()
  }
})
