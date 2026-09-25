// eslint.config.js - flat config for the backend (CommonJS + Node)
const js = require("@eslint/js");
const globals = require("globals");
const prettier = require("eslint-config-prettier");

module.exports = [
  {
    ignores: ["node_modules/**", "coverage/**"],
  },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  // ESM test files + config
  {
    files: ["tests/**/*.test.js", "vitest.config.mjs"],
    languageOptions: {
      sourceType: "module",
    },
  },
  prettier,
];
