import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      // Discourage new `as unknown as X` casts at Supabase JSONB boundary.
      // WRITE-side casts are safe but should converge on Zod parse helpers.
      "no-restricted-syntax": [
        "warn",
        {
          selector: "TSAsExpression > TSAsExpression",
          message:
            "`as unknown as X` masks type errors. Define a Zod schema + parse() at the JSONB boundary.",
        },
      ],
    },
  },
  {
    // Discourage raw inline `gradient-primary` className on <button> — use
    // `<Button variant=\"cta\">` or `<MotionButton variant=\"cta\">` instead.
    files: ["src/**/*.tsx"],
    ignores: [
      "src/components/ui/button.tsx",
      "src/components/ui/motion-button.tsx",
      "src/components/GradientButton.tsx",
      "src/index.css",
    ],
    rules: {
      "no-restricted-syntax": [
        "warn",
        {
          selector:
            "JSXOpeningElement[name.name=/^(button|motion)$/] > JSXAttribute[name.name='className'] > Literal[value=/gradient-primary/]",
          message:
            "Avoid raw `gradient-primary` on <button>. Use <Button variant=\"cta\"> or <MotionButton variant=\"cta\">.",
        },
      ],
    },
  },
);
