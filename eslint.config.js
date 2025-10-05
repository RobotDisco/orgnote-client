import js from '@eslint/js';
import globals from 'globals';
import pluginVue from 'eslint-plugin-vue';
import pluginQuasar from '@quasar/app-vite/eslint';
import vueTsEslintConfig from '@vue/eslint-config-typescript';
import prettierSkipFormatting from '@vue/eslint-config-prettier/skip-formatting';
import vueParser from 'vue-eslint-parser';
import tsParser from '@typescript-eslint/parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sonarjs from 'eslint-plugin-sonarjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default [
    {
        plugins: { sonarjs },
        rules: {
            // TODO: feat/stable-beta enable before merge
            'sonarjs/no-commented-code': 'off',
        },
    },
    {
        /**
         * Ignore the following files.
         * Please note that pluginQuasar.configs.recommended() already ignores
         * the "node_modules" folder for you (and all other Quasar project
         * relevant folders and files).
         *
         * ESLint requires "ignores" key to be the only one in this object
         */
        // ignores: []
    },

    ...pluginQuasar.configs.recommended(),
    js.configs.recommended,

    /**
     * https://eslint.vuejs.org
     *
     * pluginVue.configs.base
     *   -> Settings and rules to enable correct ESLint parsing.
     * pluginVue.configs[ 'flat/essential']
     *   -> base, plus rules to prevent errors or unintended behavior.
     * pluginVue.configs["flat/strongly-recommended"]
     *   -> Above, plus rules to considerably improve code readability and/or dev experience.
     * pluginVue.configs["flat/recommended"]
     *   -> Above, plus rules to enforce subjective community defaults to ensure consistency.
     */
    ...pluginVue.configs['flat/essential'],

    // https://github.com/vuejs/eslint-config-typescript
    ...vueTsEslintConfig({
        // Optional: extend additional configurations from typescript-eslint'.
        // Supports all the configurations in
        // https://typescript-eslint.io/users/configs#recommended-configurations
        extends: [
            // By default, only the recommended rules are enabled.
            'recommended',
            // You can also manually enable the stylistic rules.
            // "stylistic",

            // Other utility configurations, such as 'eslintRecommended', (note that it's in camelCase)
            // are also extendable here. But we don't recommend using them directly.
        ],
    }),

    // Enable typed linting for TS and Vue files (required for rules like @typescript-eslint/consistent-type-imports)
    {
        files: ['**/*.ts', '**/*.tsx', '**/*.vue'],
        languageOptions: {
            parser: vueParser,
            parserOptions: {
                parser: tsParser,
                project: [path.join(__dirname, 'tsconfig.json')],
                tsconfigRootDir: __dirname,
                extraFileExtensions: ['.vue'],
            },
        },
    },

    {
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',

            globals: {
                ...globals.browser,
                ...globals.node, // SSR, Electron, config files
                process: 'readonly', // process.env.*
                ga: 'readonly', // Google Analytics
                cordova: 'readonly',
                Capacitor: 'readonly',
                chrome: 'readonly', // BEX related
                browser: 'readonly', // BEX related
            },
        },

        // add your custom rules here
        rules: {
            'prefer-promise-reject-errors': 'off',
            '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],

            // allow debugger during development only
            'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
        },
    },

    {
        files: ['src-pwa/custom-service-worker.ts'],
        languageOptions: {
            globals: {
                ...globals.serviceworker,
            },
        },
    },

    prettierSkipFormatting,
];
