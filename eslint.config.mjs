import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
  recommendedConfig: js.configs.recommended,
});

const eslintConfig = [
  // Apply to all relevant files
  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
  },

  // Next.js and TypeScript configs
  ...compat.config({
    extends: [
      "next/core-web-vitals",
      "next/typescript",
      "prettier", // Since you have eslint-config-prettier
    ],
    // Remove the parser configuration - let Next.js handle it
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      // Add any custom rules here
      "react/no-unescaped-entities": "off",
      "@next/next/no-page-custom-font": "off",
    },
  }),

  // Ignore patterns
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "dist/**",
      "build/**",
      "coverage/**",
      ".turbo/**",
      "jest.setup.js",
    ],
  },
];

export default eslintConfig;
