import StarterKit from '@tiptap/starter-kit'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import Blockquote from '@tiptap/extension-blockquote'
import { Base64ImageUpload } from '../lib/extensions/Base64ImageUpload'
import ImageResize from 'tiptap-extension-resize-image'

export const commonTiptapExtensions = [
  StarterKit.configure({
    codeBlock: false, // Disable the default codeBlock from StarterKit
    history: false, // Disable the default history from StarterKit (we use Yjs for history)
    blockquote: false, // Disable the default blockquote from StarterKit
  }),
  Blockquote,
  CodeBlockLowlight.configure({
    lowlight: createLowlight(common),
    defaultLanguage: null,
  }),
  ImageResize.configure({}),
  Base64ImageUpload,
]
Object.freeze(commonTiptapExtensions)
