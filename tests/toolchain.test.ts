import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'
import test from 'node:test'

const require = createRequire(import.meta.url)

test('React hook rules cover TypeScript files without JSX', async () => {
  const { ESLint } = await import('eslint')
  const eslint = new ESLint()
  const results = await eslint.lintText(
    "import { useEffect } from 'react'; export function useExample(enabled: boolean) { if (enabled) useEffect(() => {}, []); }",
    { filePath: 'src/app/lib/hook-coverage-fixture.ts' },
  )
  assert.ok(
    results[0].messages.some(
      (message) => message.ruleId === 'react-hooks/rules-of-hooks',
    ),
  )
})

test('TypeScript 7 compiler and TypeScript 6 tool API are selected explicitly', () => {
  // The compatibility API also installs an older tsc binary transitively. Never
  // rely on which package last won node_modules/.bin/tsc during an install.
  const compiler = spawnSync(
    process.execPath,
    [path.resolve('node_modules/@typescript/native/bin/tsc'), '--version'],
    { encoding: 'utf8', timeout: 15_000 },
  )
  assert.equal(compiler.status, 0, compiler.stderr)
  assert.match(compiler.stdout, /^Version 7\./)
  const api = require('typescript') as {
    version: string
    createSourceFile: unknown
  }
  assert.match(api.version, /^6\./)
  assert.equal(typeof api.createSourceFile, 'function')
})

for (const consumer of [
  'eslint',
  '@eslint/config-array',
  '@typescript-eslint/typescript-estree',
]) {
  test(`${consumer} retains the named minimatch API after security override`, () => {
    const fromConsumer = createRequire(require.resolve(consumer))
    const { minimatch, Minimatch } = fromConsumer('minimatch') as {
      minimatch: (
        input: string,
        glob: string,
        opts?: { dot: boolean },
      ) => boolean
      Minimatch: unknown
    }
    assert.equal(typeof Minimatch, 'function')
    assert.equal(minimatch('.config.ts', '*.ts', { dot: true }), true)
    assert.equal(minimatch('src/note.tsx', 'src/*.{ts,tsx}'), true)
    assert.equal(minimatch('src/deep/note.tsx', 'src/*.{ts,tsx}'), false)
    assert.equal(minimatch('src/deep/note.tsx', 'src/**/*.{ts,tsx}'), true)
  })
}
