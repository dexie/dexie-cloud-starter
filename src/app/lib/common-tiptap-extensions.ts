import StarterKit from '@tiptap/starter-kit'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import { LegacyImage } from './extensions/LegacyImage'
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
  LegacyImage.configure({ allowBase64: true }),
]
Object.freeze(commonTiptapExtensions)

// Serialization uses the exact same schema, without upload handlers or resize
// NodeViews. Native Image keeps `image` and width/height; the shared extension
// renders only allowlisted legacy sizing/alignment from old attrs.style.
export const editorTiptapExtensions = [
  ...commonTiptapExtensions.map((extension) =>
    extension.name === 'image'
      ? LegacyImage.configure({
          allowBase64: true,
          resize: { enabled: true, alwaysPreserveAspectRatio: true },
        })
      : extension,
  ),
  Base64ImageUpload,
]
Object.freeze(editorTiptapExtensions)
