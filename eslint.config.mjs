import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";
import quality from "./eslint-rules/index.cjs";

export default defineConfig([
  {
    languageOptions: {
      parserOptions: { tsconfigRootDir: import.meta.dirname },
      globals: {
        console: "readonly", window: "readonly", document: "readonly",
        fetch: "readonly", URL: "readonly", localStorage: "readonly",
        navigator: "readonly", atob: "readonly", btoa: "readonly",
        setTimeout: "readonly", clearTimeout: "readonly",
      },
    },
  },
  {
    files: ["src/**/*.{js,jsx,ts,tsx,mjs,cjs}"],
    languageOptions: { parser: tseslint.parser, parserOptions: { tsconfigRootDir: import.meta.dirname } },
    plugins: { quality },
    rules: {
      // Baseline 11 files over the 350-line budget; promote to error at zero.
      "quality/max-lines": ["warn", { max: 350 }],
      "quality/no-direct-console": ["warn", { logger: "the project logging helper" }],
    },
  },
  {
    files: ["eslint-rules/**/*.cjs"],
    languageOptions: { sourceType: "commonjs", globals: { module: "readonly", require: "readonly" } },
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  globalIgnores(["**/node_modules/**", "**/dist/**", "**/build/**", "**/coverage/**", "**/.worktrees/**", "**/*.tsbuildinfo", "package-lock.json"]),
]);
