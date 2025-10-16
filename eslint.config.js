import js from "@eslint/js";
import pluginImport from "eslint-plugin-import";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node }
    },
    plugins: { import: pluginImport },
    rules: {
      "no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
      "import/order": ["warn", { "newlines-between": "always", "alphabetize": { "order": "asc" } }]
    }
  }
];
