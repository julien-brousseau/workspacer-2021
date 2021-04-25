module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    es2020: true,
    webextensions: true,
  },
  plugins: ['html'],
  extends: ['eslint:recommended'],
  parserOptions: {
    sourceType: 'module',
  },
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    semi: [2, 'always'],
    quotes: ['error', 'single'],
    'key-spacing': ['error', { 'beforeColon': false }],
    'object-curly-spacing': ['error', 'always', { 'arraysInObjects': false }],
    'space-in-parens': ['error', 'never'],
    'brace-style': ['error', '1tbs', { 'allowSingleLine': true }],
    'space-before-function-paren': ['error', 'always']
  },
};
