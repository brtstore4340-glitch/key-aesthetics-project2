// File: functions/eslint.config.cjs
const js = require("@eslint/js");
const tseslint = require("typescript-eslint");

module.exports = [
  {
    ignores: ["node_modules/**", "lib/**", "eslint.config.cjs"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      // ไม่ปิด no-explicit-any (strict ตามที่ต้องการ)
    },
  },
];
// File: .firebaserc
