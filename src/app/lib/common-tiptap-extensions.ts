import StarterKit from '@tiptap/starter-kit'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import { DexieImageNode } from './extensions/DexieImageNode'

export const commonTiptapExtensions = [
  StarterKit.configure({
    codeBlock: false, // Disable the default codeBlock from StarterKit
    history: false, // Disable the default history from StarterKit (we use Yjs for history)
  }),
  CodeBlockLowlight.configure({
    lowlight: createLowlight(common),
    defaultLanguage: null,
  }),
  DexieImageNode.configure({
    inline: false,
    allowBase64: true,
    HTMLAttributes: {
      style: 'max-width: 100%; height: auto;',
    },
  }),
]
Object.freeze(commonTiptapExtensions)
