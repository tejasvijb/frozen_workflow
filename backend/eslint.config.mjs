// @ts-check

import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import perfectionist from "eslint-plugin-perfectionist";

export default defineConfig(eslint.configs.recommended, tseslint.configs.recommended, {
  files: ["**/*.ts", "**/*.tsx"],
  ignores: ["dist/**"],
  languageOptions: {
    parserOptions: {
      projectService: true,
      tsconfigRootDir: import.meta.dirname,
    },
  },
  plugins: {
    perfectionist,
  },
  ...perfectionist.configs["recommended-natural"],
});
