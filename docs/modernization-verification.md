# Modernization verification — 2026-11-06

Candidate: `liz/starter-modernization-20261106`. No production deployment.

## Toolchain and dependency evidence

- Registry-checked stable versions: Next 16.4.5, React 19.3.1, MUI 9.5.0, Tiptap 3.33.0, TypeScript 7.0.2, ESLint 10.14.0. `npm outdated --depth=0 --json` returned `{}`. The TypeScript 6.0.2 API alias is intentional; the standalone typecheck explicitly invokes TypeScript 7.
- Node 24.16.0 / npm 11.12.1. A clean `npm ci --strict-peer-deps` and a separate empty-directory `npm install --strict-peer-deps` both exited 0 without engine/deprecation/peer warnings. The empty installation contained the exact candidate package.json and package-lock.json. Both files were SHA-256 identical afterward.
- Ordinary `npm install --strict-peer-deps` after clean CI install also left both files byte-identical.
- Full `npm audit` and production `npm audit --omit=dev` each exited 0, with zero vulnerabilities. These are npm results at verification time, not a claim about FOSSA findings or future advisories.
- `npm ls yjs --all` resolves a single Yjs 13.6.33 dependency path. Production/client singleton behavior is checked separately below.

## Review-driven fixes

Independent review of the initial candidate found a pre-existing published useDocument lease bug, legacy image-style compatibility loss, insufficient concurrent-upload target coverage, and missing hook lint coverage in non-JSX TypeScript. These findings are being addressed before final verification. No core Dexie API or protocol changes are included.

## Final local gates

- `npm run lint`: exit 0, ESLint `--max-warnings=0`.
- `npm run typecheck`: exit 0 using the explicitly pinned TypeScript 7 compiler.
- `npm test`: exit 0, 29 tests passed / 0 failed, including provider-lease, legacy image compatibility, async two-Y.Doc upload mapping, toolchain, and ESLint coverage. The provider suite emits expected Y.Doc-destroyed diagnostics after balanced release.
- `npm audit --audit-level=low` and `npm audit --omit=dev --audit-level=low`: both exit 0, zero vulnerabilities.
- `npm run build`: exit 0 on Next.js 16.4.5; all nine app routes generated/compiled. `git diff --check`: exit 0.
- Fresh `npm ci --strict-peer-deps` and ordinary clean-directory `npm install --strict-peer-deps` passed without engine, deprecation, or peer warnings; manifests/lockfile hashes remained unchanged.

## Browser and Cloud evidence

Initial browser checks reproduced a mounted document being destroyed by the published useDocument hook; this is a failed baseline, not a passed Yjs lifecycle test. Separate starter-alice, starter-bob and openclaw profiles use independent IndexedDB stores against the dedicated test database.

Alice created `liz-test-final-20261106-1556` through the UI, shared it with Bob, and Bob accepted using the actual green accept icon. Alice posted `liz-test-final-card-20261106-1556`; Bob saw the card/rendered content without reload in a bounded 1003ms observation. After the lifecycle fix and production rebuild, both separate profiles reopened the same posted card and saw `doc.isDestroyed === false`; Bob's live Yjs text edit appeared in Alice, Ctrl+Z removed it for both, Ctrl+Shift+Z restored it, and Alice's Awareness exposed Bob's user/cursor state. Bob pasted a PNG; the Image NodeView exposed all four native resize handles and the image replicated to Alice. After reloading both profiles, the text and image remained in each editor. Unit tests additionally verify native resize writes width/height, syncs to a second Y.Doc, and preserves/sanitizes legacy styles.

Full-text search was exercised through the browser's search input against an owned card: the exact marker matched, while a non-matching query hid it. Three uniquely owned test spaces (the two collaboration fixtures and the search fixture), plus their cards/shares, were deleted using the app's Delete-space UI. The follow-up space lists in Alice, Bob, and the separate fresh Alice profile contained none of those test names or cards.

## Hosted CI

Pending final review, commit, focused PR creation, and hosted CI. No production deployment.
