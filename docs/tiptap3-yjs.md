# Tiptap 3, Yjs and Dexie Cloud

Source review: 2026-11-06. Target stack: Tiptap 3.33.0, @tiptap/y-tiptap 3.2.0, Yjs 13.6.33, y-dexie 4.4.0 and dexie-cloud-addon 4.4.16. Runtime certification is separate from this architecture review; see the PR verification record for tests actually executed.

## Conclusion

No necessary API or synchronization-protocol change in y-dexie or dexie-cloud-addon was identified. Tiptap 3 still edits an ordinary Y.Doc / Y.XmlFragment. Dexie persists whole-document Yjs updates, synchronizes them and supplies standard Awareness; Tiptap supplies the ProseMirror binding and editor schema. Basic collaboration and carets do **not** require Tiptap Cloud or Hocuspocus. Commercial collaboration features are a separate product and are not implicitly supported by a generic provider.

The important changes are in the application integration, not a redesign of Dexie. This is a source-backed conclusion, not a claim that every lifecycle, authorization or reconnection edge case has been certified.

## Integration contract

1. Open/configure the Dexie database before obtaining its provider. Use the table document property and retain its identity (table, primary key, property). Keep fragment **default** for editing and serialization. Renaming a fragment creates a different shared root; it does not migrate rich text.
2. Keep one balanced provider acquisition per consumer. The provider and its Awareness are Dexie-owned. Editor teardown must not directly destroy the shared Y.Doc, provider or Awareness. Local hydration (`whenLoaded`) is different from server synchronization (`whenSynced`); do not block cached offline editing on a network milestone.
3. Use **CollaborationCaret**, replacing CollaborationCursor. Pass the existing provider only when its real Awareness is available. User metadata is for display, not authentication. Current caret colors require six-digit #RRGGBB; the CSS class prefix is collaboration-carets.
4. Disable StarterKit ordinary history using **undoRedo: false**. Collaboration supplies fragment-scoped Yjs undo/redo. Its binding origin changed from y-prosemirror to **@tiptap/y-tiptap**: keys imported from those packages are not interchangeable. Never add DexieYProvider or its instance to trackedOrigins; otherwise remote/database replay may enter local undo history. Deliberate programmatic edits need a deliberate application origin and tests.
5. Persist the **whole binary Y.Doc**, not an HTML/JSON export of one fragment. The current binding can use additional internal root types. Dexie already persists V2 updates; Tiptap v2/v3 and Yjs binary V1/V2 are unrelated version axes. No encoding conversion is needed for ordinary editor transactions. Raw V1 bytes must not be inserted into a V2 apply/storage path.
6. Every writer and renderer must agree on schema. CRDT convergence does not make incompatible rich-text schemas safe. The same requirement applies to read-only views and clients that have not refreshed.

## Schema safety is an important new improvement

The verified latest pair, Collaboration 3.33.0 and binding 3.2.0, supports preserving unknown shared content when **enableContentCheck: true** is combined with a handled **onContentError**. Incompatible content pauses editing/undo rather than silently stripping and synchronizing its removal. Default unguarded behavior can delete unsupported nodes, even from read-only editors. Show a refresh/update warning; do not blindly call the supplied disableCollaboration callback, because it destroys the shared Y.Doc and can affect other views. Earlier 3.x releases do not necessarily have the same protection.

## Images without an unnecessary migration

The old starter pinned tiptap-extension-resize-image 1.2.1, which inherited the node name **image** and stored sizing in a style attribute. Version 1.4.7 independently changed that node to **imageResize**, creating the apparent migration obstacle. This is not a required Tiptap 3 transport change. Native Tiptap Image now supports resizing and keeps **image**, so the starter can remove the third-party extension while retaining the original node name. Base64 handling must remain enabled for uploads.

A narrow compatibility attribute may preserve allowlisted legacy sizing/alignment. A name match is not a general attribute/style migration. Existing data already written as imageResize would need a deliberate alias/conversion; fresh customers do not need that machinery. Mixed old/new clients still require compatible schema deployment.

## Lifecycle and offline considerations

Tiptap React handles editor instance recreation and delayed teardown, but does not own external provider leases. Stable document/provider identities and updateUser avoid needless editor recreation and lost focus/history. Preserve balanced load/release under StrictMode, rapid navigation and multiple same-document views; the grace period is not proof against refcount leaks. The existing useDocument hook deserves an independent reproducer before making any core API change based only on a source-review concern.

Awareness is ephemeral. Offline document edits can persist locally; remote cursors cannot be guaranteed offline. Same-document views share one Awareness/clientID, so one view closing can clear the local cursor until the focused view republishes. Cloud rejection/deletion may destroy an active document; consumers must stop using it and follow an explicit recovery policy. Do not promise that rejected offline edits are automatically restored.

One installed Yjs version is necessary but insufficient: mixing CommonJS and ESM builds can still create separate constructor/plugin identities. Use consistent distribution builds, inspect the dependency graph and test production/client bundles for duplicate-import warnings. Do not introduce a second network provider merely to satisfy a caret example.

## Optional simplifications, not required core changes

- Use the current binding converter helpers instead of keeping a second y-prosemirror binding stack solely for export. Preserve fragment/schema round-trip tests.
- Use native Image resizing to remove the third-party extension and its schema rename.
- Stabilize extension identities and update user metadata without replacing the editor.
- Document the generic provider/Awareness shape more precisely; no breaking Dexie API is required by the inspected code.

## Regression checklist

- Two independently authenticated profiles: authorized sharing, text both directions, carets, local undo excluding remote changes, redo and persisted reload.
- Hydration and same fragment/schema across editing, card rendering and export; legacy image fixture and native resize.
- Warm-cache offline edit/reopen, reverse reconnect and convergence; distinguish local durability from server acceptance.
- StrictMode remounts, document switches and concurrent consumers: balanced leases, no destroyed-doc access or growing presence/listeners.
- Unsupported-schema fixture pauses without destructive writes. Revoked permissions and deleted documents stop editing safely.
- Default production build and browser console contain no duplicate Yjs/plugin warnings; no peer-dependency bypasses.

These are explicit test targets, not a statement that every item has run.

## Source evidence

Official guidance:
- https://tiptap.dev/docs/guides/upgrade-tiptap-v2
- https://tiptap.dev/docs/editor/extensions/functionality/collaboration
- https://tiptap.dev/docs/editor/extensions/functionality/collaboration-caret
- https://tiptap.dev/docs/guides/invalid-schema
- https://tiptap.dev/docs/editor/extensions/nodes/image
- https://docs.yjs.dev/api/document-updates

Version-pinned upstream implementation:
- https://unpkg.com/@tiptap/extension-collaboration@3.33.0/src/collaboration.ts (document/fragment, undo, schema-error callback)
- https://unpkg.com/@tiptap/extension-collaboration-caret@3.33.0/src/collaboration-caret.ts (generic Awareness contract and listener cleanup)
- https://unpkg.com/@tiptap/y-tiptap@3.2.0/src/lib/plugins/ySyncPlugin.ts
- https://unpkg.com/@tiptap/y-tiptap@3.2.0/src/lib/plugins/yUndoPlugin.ts
- https://unpkg.com/@tiptap/y-tiptap@3.2.0/src/lib/utils/conversion/createNodeFromYElement.ts
- https://unpkg.com/@tiptap/react@3.33.0/src/useEditor.ts
- https://unpkg.com/@tiptap/extension-image@3.33.0/src/image.ts
- https://unpkg.com/tiptap-extension-resize-image@1.2.1/dist/index.js
- https://unpkg.com/tiptap-extension-resize-image@1.4.7/esm/index.js

Dexie checkout reviewed at 45aade72aa19a601e6a13aa877beb7389e15b5d2 (published 4.4.0/4.4.16 source maps were also compared for relevant provider behavior):
- addons/y-dexie/src/DexieYProvider.ts:65–132 load/release/grace/refcount,143–188 hydration versus server sync,207–240 observation/cleanup.
- addons/y-dexie/src/observeYDocUpdates.ts:52–65 remote provider origin,78–104 local persistence/updateV2.
- addons/dexie-cloud/src/yjs/createYHandler.ts:38–125 Awareness creation/transport/cleanup.
- addons/dexie-cloud/src/yjs/applyYMessages.ts:53–95 rejection/destruction and sync acknowledgment.
- libs/dexie-react-hooks/src/useDocument.ts:13,35–69 ownership/grace and the lifecycle concern that warrants a separate focused reproducer.
- https://github.com/dexie/Dexie.js/tree/45aade72aa19a601e6a13aa877beb7389e15b5d2/addons/y-dexie/src
- https://github.com/dexie/Dexie.js/tree/45aade72aa19a601e6a13aa877beb7389e15b5d2/addons/dexie-cloud/src/yjs
