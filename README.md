# Dexie Cloud Starter

A local-first notes starter using Next.js 16, React 19, MUI 9, Tiptap 3 and Yjs, with persistence and collaboration provided by Dexie Cloud and y-dexie.

## Requirements

Use Node.js 24 (recommended), or supported Node.js 22.14+ releases, and npm 11.12.1. The project uses normal npm peer-dependency resolution; no `--legacy-peer-deps` is needed.

Type checking uses the stable TypeScript 7 native compiler. Next.js and typescript-eslint still require the TypeScript 6 compiler API, so the project uses Microsoft's [documented side-by-side npm aliases](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6.0). `npm run typecheck` runs TypeScript 7; the API compatibility package does not downgrade that command.

## Getting Started

First, create a database in Dexie Cloud

```
npx dexie-cloud create
```

Notice the DB URL on the console.

Then, whitelist the origin used to access the app

```
npx dexie-cloud whitelist http://localhost:3000
```

Then, create an .env file with the variable

```
NEXT_PUBLIC_DEXIE_CLOUD_DB_URL=<DB URL> # (something like https://zabc123.dexie.cloud)
```

Then, run the development server:

```bash
npm install
npm run dev -- --port 3000
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Verification

```bash
npm ci --strict-peer-deps
npm run lint
npm run typecheck
npm test
npm run build
npm audit
npm audit --omit=dev
```

CI runs these checks on Node.js 22 and 24 and verifies that an ordinary `npm install` leaves the committed manifest and lockfile unchanged. Next.js uses Turbopack by default; Webpack remains available with `npm run dev -- --webpack --port 3000`. Both bundlers resolve Yjs to one module instance.

For runtime verification, use two independent browser profiles against your own test database: create and share a space, post a card, verify remote edits and awareness without reload, check undo/redo and reload persistence, then delete only your own test data and verify deletion in the peer. A successful build or a local reload alone does not prove cloud collaboration.

See [Tiptap 3 and Yjs integration](docs/tiptap3-yjs.md) for the integration contract, provider lifecycle, image schema compatibility and architectural findings.

# The Application

Search My Brain is a showcase application. It implements the following features:

- [x] Offline storage and sync
- [x] Conflict-free rich text editing with Tiptap and Y.js with collaborative editing and awareness (showing each other's cursors)
- [x] Full text search in notes
- [x] Spaces and sharing (sharing spaces of notes with friends)

## Possible improvements

- [ ] PWA and service worker. Use [next-pwa](https://www.npmjs.com/package/next-pwa), [workbox](https://developer.chrome.com/docs/workbox/) or write your own.
- [ ] [Activate Background sync](<https://dexie.org/cloud/docs/db.cloud.configure()#tryuseserviceworker>)

## Extend Sign-in options

The app comes with email One-Time Password login out of the box. To add Github Signin, [create an OAuth app](https://github.com/settings/developers) on Github and add the following to your .env file:

- NEXT_PUBLIC_GITHUB_CLIENT_ID=(this value comes from your oath app on Github)
- GITHUB_CLIENT_SECRET=(this value comes from your oath app on Github)
- NEXT_PUBLIC_GITHUB_REDIRECT_URI=http://localhost:3000/api/auth/callback/github
- DEXIE_CLOUD_CLIENT_ID=(this value comes from your dexie-cloud.key file)
- DEXIE_CLOUD_CLIENT_SECRET=(this value comes from your dexie-cloud.key file)
