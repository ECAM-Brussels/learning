import js from '@eslint/js'
import prettier from 'eslint-config-prettier/flat'
import * as mdx from 'eslint-plugin-mdx'
import { defineConfig, includeIgnoreFile } from 'eslint/config'
import globals from 'globals'
import { fileURLToPath } from 'node:url'
import tseslint from 'typescript-eslint'

const gitignore = fileURLToPath(new URL('.gitignore', import.meta.url))

export default defineConfig(
  includeIgnoreFile(gitignore),
  { ignores: ['**/*gen.*.ts', '**/*.d.ts'] },

  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/triple-slash-reference': ['error', { path: 'always' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      // French prose needs no-break spaces before punctuation (see AGENTS.md).
      'no-irregular-whitespace': ['error', { skipJSXText: true, skipStrings: true }],
      // Solid refs (`let el!: HTMLElement` + `ref={el}`) are assigned by the compiler.
      'no-unassigned-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },

  {
    ...mdx.flat,
    files: ['**/*.mdx'],
    processor: mdx.createRemarkProcessor({ lintCodeBlocks: false }),
    rules: {
      ...mdx.flat.rules,
      'no-unused-vars': 'error',
    },
  },

  // Must stay last: turns off every rule that would conflict with prettier.
  prettier,
)
