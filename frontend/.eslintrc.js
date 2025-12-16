module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'next/core-web-vitals',
    '@typescript-eslint/recommended',
    'prettier',
  ],
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-empty-function': 'warn',
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
    'react-hooks/exhaustive-deps': 'warn',
  },
  env: {
    browser: true,
    node: true,
    es2021: true,
  },
};