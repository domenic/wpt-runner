import domenicConfig from "@domenic/eslint-config";
import globals from "globals";
export default [
  {
    ignores: [
      "common/**",
      "testharness/**",
      "wpt/**"
    ]
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: globals.node
    }
  },
  ...domenicConfig,
  {
    rules: {
      "no-console": "off"
    }
  }
];
