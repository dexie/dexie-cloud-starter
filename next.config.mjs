import path from 'path'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next 16 uses Turbopack by default. All editor/provider imports must share
  // one Yjs module instance (including HTML rendering and awareness).
  turbopack: {
    resolveAlias: {
      yjs: path.resolve('node_modules/yjs/dist/yjs.mjs'),
    },
  },
  // Keep the same module identity for the optional --webpack fallback.
  webpack: (config) => {
    config.resolve.alias.yjs = path.resolve('node_modules/yjs/dist/yjs.mjs')
    return config
  },
}

export default nextConfig
