import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      react,
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      // Without this, no-unused-vars can't see that <motion.div> etc. (a
      // lowercase identifier only ever used inside JSX) actually uses the
      // `motion` import - it flags it as dead code. Confirmed the hard way:
      // trusting that false positive briefly stripped a live `motion` import
      // from working pages before this got caught. This rule teaches
      // no-unused-vars to recognize JSX element/member-expression usage.
      'react/jsx-uses-vars': 'error',
    },
  },
  // api/ and lib/ run in Node (Vercel serverless functions), not the
  // browser - they need Node globals (process, etc.), not browser globals.
  {
    files: ['api/**/*.js', 'lib/**/*.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
])
