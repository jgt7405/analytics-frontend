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
      // Temporarily disable the unescaped entities rule
      "react/no-unescaped-entities": "off", // ✅ Add this line

      // Make other rules warnings instead of errors
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-require-imports": "off",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/rules-of-hooks": "error",
      "@next/next/no-img-element": "warn",
      "@typescript-eslint/no-this-alias": "off",
    },
  }),

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
