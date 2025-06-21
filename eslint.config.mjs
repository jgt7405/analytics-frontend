import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
  recommendedConfig: js.configs.recommended,
});

const eslintConfig = [
  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
  },

  ...compat.config({
    extends: ["next/core-web-vitals", "next/typescript", "prettier"],
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      // Make some rules warnings instead of errors for gradual improvement
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-require-imports": "off", // Allow in config files
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/rules-of-hooks": "error", // Keep this strict - it prevents bugs
      "@next/next/no-img-element": "warn",

      // Allow any in specific contexts
      "@typescript-eslint/no-this-alias": "off",
    },
  }),

  // Special rules for config files
  {
    files: ["*.config.{js,mjs,ts}", "next.config.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },

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
      "public/**",
    ],
  },
];

export default eslintConfig;
