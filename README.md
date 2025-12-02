This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fdexie%2Fdexie-cloud-starter.svg?type=shield)](https://app.fossa.com/projects/git%2Bgithub.com%2Fdexie%2Fdexie-cloud-starter?ref=badge_shield)


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
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

# The Application

Search My Brain is a showcase application. It implements the following features:

- [x] Offline storage and sync
- [x] Conflict-free rich text editing with Tiptap and Y.js with collaborative editing and awaress (showing each other's cursors)
- [x] Full text search in notes
- [x] Spaces and sharing (sharing spaces of notes with friends)

## Possible improvements

- [ ] PWA and service worker. Use [next-pwa](https://www.npmjs.com/package/next-pwa), [workbox](https://developer.chrome.com/docs/workbox/) or write your own.
- [ ] [Activate Background sync](<https://dexie.org/cloud/docs/db.cloud.configure()#tryuseserviceworker>)

## Extend Sign-in options

The app comes with email One-Time Password login out of the box. To add Github Signin, [create an Oath app](https://github.com/settings/developers) on Github and add the following to your .env file:

- NEXT_PUBLIC_GITHUB_CLIENT_ID=(this value comes from your oath app on Github)
- GITHUB_CLIENT_SECRET=(this value comes from your oath app on Github)
- NEXT_PUBLIC_GITHUB_REDIRECT_URI=http://localhost:3000/api/auth/callback/github
- DEXIE_CLOUD_CLIENT_ID=(this value comes from your dexie-cloud.key file)
- DEXIE_CLOUD_CLIENT_SECRET=(this value comes from your dexie-cloud.key file)


## License
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fdexie%2Fdexie-cloud-starter.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2Fdexie%2Fdexie-cloud-starter?ref=badge_large)