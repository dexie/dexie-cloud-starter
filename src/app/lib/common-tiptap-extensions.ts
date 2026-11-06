import StarterKit from '@tiptap/starter-kit'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import Image from '@tiptap/extension-image'
import { Base64ImageUpload } from './extensions/Base64ImageUpload'

// Keep the persisted fragment and image node names stable.
export const tiptapFragmentName = 'default'

export const commonTiptapExtensions = [
  StarterKit.configure({
    codeBlock: false, // Disable the default codeBlock from StarterKit
    undoRedo: false, // Collaboration owns the fragment-scoped Yjs undo history.
  }),
  CodeBlockLowlight.configure({
    lowlight: createLowlight(common),
    defaultLanguage: null,
  }),
  Image.configure({ allowBase64: true }),
]
Object.freeze(commonTiptapExtensions)

// Serialization uses the exact same schema, without upload handlers or resize
// NodeViews. Native Image keeps the old `image` name and stores width/height.
export const editorTiptapExtensions = [
  ...commonTiptapExtensions.map((extension) =>
    extension.name === 'image'
      ? Image.configure({
          allowBase64: true,
          resize: { enabled: true, alwaysPreserveAspectRatio: true },
        })
      : extension,
  ),
  Base64ImageUpload,
]
Object.freeze(editorTiptapExtensions)
