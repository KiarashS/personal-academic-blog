import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist', 'dist-server', 'node_modules', '.cache'] },

  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  prettier,

  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // Unused names are errors, except the `_`-prefixed ones used when
      // destructuring a field away on purpose.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { fixStyle: 'separate-type-imports' },
      ],
    },
  },

  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },

  {
    // An ambient declaration file cannot use a top-level import without
    // becoming a module, which would drop the `declare module` blocks.
    files: ['src/env.d.ts'],
    rules: { '@typescript-eslint/consistent-type-imports': 'off' },
  },

  {
    files: ['plugins/**/*.ts', 'vite.config.ts', 'src/entry-server.tsx'],
    languageOptions: { globals: globals.node },
  },

  {
    // Build scripts are plain ESM run by node, outside the TypeScript project.
    files: ['scripts/**/*.mjs', 'eslint.config.js'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
      parserOptions: { projectService: false },
    },
  },
);
