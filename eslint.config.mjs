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

  // Architecture boundaries (docs/ARCHITECTURE_PLAN.md, step 2).
  // Advisory: long files are a signal, not a rule; split them in step 7.
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "max-lines": [
        "warn",
        { max: 600, skipBlankLines: true, skipComments: true },
      ],
    },
  },
  // Presentation components don't own network access: fetch data in pages,
  // route handlers, hooks or src/services. Warning until step 4 moves the
  // existing calls.
  {
    files: ["src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-globals": [
        "warn",
        {
          name: "fetch",
          message:
            "Components don't fetch directly. Use a hook in src/hooks or a method in src/services.",
        },
      ],
    },
  },
  // Sports stay independent: shared code lives in shared folders
  // (components/features/shared, components/common, lib, services).
  {
    files: [
      "src/components/features/basketball/**",
      "src/app/basketball/**",
      "src/hooks/useBasketball*",
      "src/hooks/useBball*",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/components/features/football/*",
                "@/app/football/*",
                "@/hooks/useFootball*",
              ],
              message:
                "Basketball code must not import football code. Move shared logic to a shared folder.",
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      "src/components/features/football/**",
      "src/app/football/**",
      "src/hooks/useFootball*",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/components/features/basketball/*",
                "@/app/basketball/*",
                "@/hooks/useBasketball*",
                "@/hooks/useBball*",
              ],
              message:
                "Football code must not import basketball code. Move shared logic to a shared folder.",
            },
          ],
        },
      ],
    },
  },

  {
    files: [
      "*.config.{js,mjs,ts}",
      "next.config.js",
      "**/__tests__/**",
      "**/*.test.{ts,tsx}",
    ],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-var-requires": "off",
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
