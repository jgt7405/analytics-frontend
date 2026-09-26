import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  prettier,

  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    rules: {
      // Temporarily disable the unescaped entities rule
      "react/no-unescaped-entities": "off",

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

      // React Compiler rules added by eslint-plugin-react-hooks 7 (ESLint 9
      // upgrade). They flag working code that the compiler can't optimize
      // (~100 hits across ~60 files); advisory until components are
      // reworked (plan steps 7-8).
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
    },
  },

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
  // route handlers, hooks or src/services (step 4 moved the last calls).
  {
    files: ["src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-globals": [
        "error",
        {
          name: "fetch",
          message:
            "Components don't fetch directly. Use a hook in src/hooks or a method in src/services.",
        },
      ],
    },
  },
  // Logging goes through src/lib/logger.ts (levels per environment,
  // redaction), not console.* directly.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["**/__tests__/**"],
    rules: { "no-console": "error" },
  },
  // Backend URLs are built from the endpoint list with apiUrl()/apiPath()
  // (src/api/urls.ts), never by hand: that checks the key, parameters and
  // query, and adds the trailing slash that avoids a 308 redirect. React
  // Query keys come from queryKeys (src/lib/query-keys.ts). All in one
  // block: a second no-restricted-syntax entry would replace this one.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      "src/lib/proxy-url.ts",
      "src/api/urls.ts",
      "src/services/shared-request.ts",
      "src/app/api/**",
      "**/__tests__/**",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/^\\x2Fapi\\x2Fproxy/]",
          message: "Build backend URLs with apiUrl() from @/api/urls.",
        },
        {
          selector: "TemplateLiteral > TemplateElement:first-child[value.raw=/^\\x2Fapi\\x2Fproxy/]",
          message: "Build backend URLs with apiUrl() from @/api/urls.",
        },
        {
          selector: "ImportDeclaration[source.value='@/lib/proxy-url']",
          message: "Build backend URLs with apiUrl() / apiPath() from @/api/urls.",
        },
        {
          selector: "Property[key.name='queryKey'] > ArrayExpression",
          message: "Use a key from queryKeys in @/lib/query-keys.",
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
      "test-results/**",
      "playwright-report/**",
    ],
  },
];

export default eslintConfig;
