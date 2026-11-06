import { defineConfig, globalIgnores } from 'eslint/config'
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import react from '@eslint-react/eslint-plugin'
import reactHooks from 'eslint-plugin-react-hooks'
import next from '@next/eslint-plugin-next'
import globals from 'globals'

export default defineConfig([
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    files: ['**/*.{jsx,tsx}'],
    extends: [react.configs['recommended-typescript']],
    plugins: { '@next/next': next },
    rules: {
      ...next.configs.recommended.rules,
      ...next.configs['core-web-vitals'].rules,
    },
  },
])
