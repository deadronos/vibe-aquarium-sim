// Use the built-in ESLint 'eslint:recommended' instead of importing config objects
// Use string-based `extends` entries so ESLint resolves plugins by name
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: globals.browser,
    },
    // plugin modules are already registered inside the imported configs
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    // incorporate eslint-config-prettier's rules directly (flat config doesn't accept string "prettier")
    rules: {
      ...prettierConfig.rules,
    },
    settings: { react: { version: 'detect' } },
  },
]);
