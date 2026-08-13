import js from "@eslint/js";
import globals from "globals";

export default [
	js.configs.recommended,
	{
		languageOptions: {
			ecmaVersion: "latest",
			sourceType: "module",
			globals: {
				...globals.browser,
				...globals.webextensions,
			},
		},
		rules: {
			"no-unused-vars": ["warn", {
				argsIgnorePattern: "^_",
				varsIgnorePattern: "^_",
				caughtErrorsIgnorePattern: "^_"
			}],
			"no-undef": "warn",
		},
	},
	{
		// Test harness runs under Bun, not in the browser. It still needs the
		// browser globals from the block above for the code it evaluates inside
		// the page, so this only adds the runtime ones.
		files: ["tests/**/*.mjs"],
		languageOptions: {
			globals: {
				...globals.node,
			},
		},
	},
];
