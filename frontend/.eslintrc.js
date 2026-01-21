module.exports = {
  extends: [
    'next/core-web-vitals',
  ],
  rules: {
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
  },
  env: {
    browser: true,
    node: true,
    es2021: true,
  },
};