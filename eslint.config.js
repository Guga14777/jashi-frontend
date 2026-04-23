import js from "@eslint/js";
import globals from "globals";
import pluginReact from "eslint-plugin-react";

export default [
  {
    ignores: ["dist/**", "build/**", "node_modules/**", "*.min.js"]
  },
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.es2021
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    }
  },
  js.configs.recommended,
  pluginReact.configs.flat.recommended,
  {
    settings: {
      react: {
        version: "detect"
      }
    },
    rules: {
      // Turn off PropTypes requirements
      "react/prop-types": "off",
      
      // Warn for unused vars instead of error, ignore underscore prefixed
      "no-unused-vars": ["warn", { 
        "argsIgnorePattern": "^_", 
        "varsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_"
      }],
      
      // Turn off unescaped entities check
      "react/no-unescaped-entities": "off",
      
      // React 17+ doesn't require React import
      "react/react-in-jsx-scope": "off",
      
      // Allow JSX in .js files
      "react/jsx-filename-extension": [1, { "extensions": [".js", ".jsx"] }],
      
      // Other helpful rules to reduce noise
      "no-console": "warn",
      "no-debugger": "warn",
      "no-empty": ["error", { "allowEmptyCatch": true }],
      "no-case-declarations": "off",
      "no-constant-condition": "warn",
      "no-control-regex": "warn",
      "no-fallthrough": "warn",
      "no-func-assign": "warn",
      "no-prototype-builtins": "warn",
      "no-useless-escape": "warn",
      "valid-typeof": "error",
      "getter-return": "warn",
      "no-cond-assign": "warn",
      "no-misleading-character-class": "warn",
      
      // React specific
      "react/display-name": "off",
      "react/no-unknown-property": "warn"
    }
  }
];