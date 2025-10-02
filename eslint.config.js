// import js from "@eslint/js";
const js = require('@eslint/js');
const globals = require('globals');
// const defineConfig = require('eslint/config');
// import globals from "globals";
// import { defineConfig } from "eslint/config";

module.exports = [
  { files: ["**/*.{js,mjs,cjs}"], plugins: { js }, languageOptions: { globals: globals.browser } },
  { files: ["**/*.js"], languageOptions: { sourceType: "commonjs" } },
  { files: ["**/*.test.*", "**/*.spec.*"], languageOptions: {
    globals: {
      ...globals.jest,
      ...globals.browser,
    }
  }}
];
