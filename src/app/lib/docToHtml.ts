import { generateHTML, generateJSON } from '@tiptap/html'
import * as Y from 'yjs'
import { yDocToProsemirrorJSON, prosemirrorJSONToYDoc } from '@tiptap/y-tiptap'
import { useDocument } from 'dexie-react-hooks'
import { getSchema } from '@tiptap/core'
import {
  commonTiptapExtensions,
  tiptapFragmentName,
} from './common-tiptap-extensions'

// @tiptap/html selects its browser or Node implementation via package exports.
// Do not import /server here: this module is also used by client components.
export function docToHtml(yDoc: Y.Doc): string {
  const json = yDocToProsemirrorJSON(yDoc, tiptapFragmentName)
  return generateHTML(json, commonTiptapExtensions)
}

export function htmlToDoc(html: string) {
  const schema = getSchema(commonTiptapExtensions)
  const json = generateJSON(html, commonTiptapExtensions)
  return prosemirrorJSONToYDoc(schema, json, tiptapFragmentName)
}

export function useDocToHtml(yDoc: Y.Doc | undefined): string {
  useDocument(yDoc) // Loads the document; this hook owns only its own lease.
  return yDoc ? docToHtml(yDoc) : ''
}
