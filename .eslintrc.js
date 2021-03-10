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
    quotes: ['error', 'single']
  },
};
