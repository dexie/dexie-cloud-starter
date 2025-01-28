import StarterKit from '@tiptap/starter-kit'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'

export const commonTiptapExtensions = [
  StarterKit.configure({
    codeBlock: false, // Disable the default codeBlock from StarterKit
    history: false, // Disable the default history from StarterKit (we use Yjs for history)
  }),
  CodeBlockLowlight.configure({
    lowlight: createLowlight(common),
    defaultLanguage: null,
  }),
]
Object.freeze(commonTiptapExtensions)
