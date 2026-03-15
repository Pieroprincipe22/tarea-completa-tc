import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default [
  // Ignorados (flat config)
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/out/**',
      '**/coverage/**',
      '**/.turbo/**',
      '**/.pnpm-store/**',
      '**/build/**',
      '**/tmp/**',
      '**/*.min.*',
      '**/*.d.ts'
    ]
  },

  // TypeScript / NestJS
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: ['./tsconfig.eslint.json'],
        tsconfigRootDir: __dirname,
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin
    },
    rules: {
      // base recomendado (sin volverte loco)
      ...tsPlugin.configs.recommended.rules,

      // si te molesta el ruido:
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off'
    }
  }
]
