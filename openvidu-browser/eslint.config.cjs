const tseslint = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const importPlugin = require('eslint-plugin-import');
const globals = require('globals');

module.exports = [
    {
        ignores: ['lib/**', 'ts4.4/**', 'node_modules/**', 'static/**', 'openvidu-browser-*.tgz']
    },
    {
        files: ['**/*.ts'],
        languageOptions: {
            parser: tsParser,
            ecmaVersion: 2020,
            sourceType: 'module',
            parserOptions: {
                project: ['./tsconfig.json', './src/OpenVidu/tsconfig.json'],
                tsconfigRootDir: __dirname,
                noWarnOnMultipleProjects: true
            },
            globals: {
                ...globals.browser,
                ...globals.node
            }
        },
        plugins: {
            '@typescript-eslint': tseslint,
            import: importPlugin
        },
        settings: {
            'import/resolver': {
                node: {
                    extensions: ['.js', '.ts']
                },
                typescript: {
                    project: ['./tsconfig.json', './src/OpenVidu/tsconfig.json'],
                    noWarnOnMultipleProjects: true
                }
            }
        },
        linterOptions: {
            reportUnusedDisableDirectives: 'off'
        },
        rules: {
            '@typescript-eslint/array-type': 'off',
            '@typescript-eslint/consistent-type-definitions': 'off',
            '@typescript-eslint/no-empty-function': 'off',
            '@typescript-eslint/no-empty-interface': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-inferrable-types': 'off',
            '@typescript-eslint/no-wrapper-object-types': 'off',
            '@typescript-eslint/no-namespace': 'off',
            '@typescript-eslint/no-var-requires': 'off',
            curly: 'off',
            eqeqeq: 'off',
            'import/no-extraneous-dependencies': [
                'error',
                {
                    devDependencies: ['config/**', '**/*.spec.ts', '**/*.test.ts']
                }
            ],
            'import/no-unresolved': 'off',
            'no-trailing-spaces': ['error', { skipBlankLines: false, ignoreComments: false }],
            'no-var': 'off',
            'object-shorthand': 'off',
            'prefer-const': 'off',
            quotes: 'off',
            semi: ['error', 'always'],
            'no-unused-vars': 'off',
            'no-extra-boolean-cast': 'off',
            'no-undef': 'off'
        }
    }
];
