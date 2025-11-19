import importPlugin from 'eslint-plugin-import';
import jsdoc from 'eslint-plugin-jsdoc';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: ['lib/**', 'node_modules/**']
    },
    ...tseslint.configs.recommended,
    ...tseslint.configs.stylistic,
    {
        files: ['src/**/*.ts'],
        languageOptions: {
            parser: tseslint.parser
        },
        plugins: {
            '@typescript-eslint': tseslint.plugin,
            import: importPlugin,
            jsdoc
        },
        settings: {
            jsdoc: {
                mode: 'typescript'
            },
            'import/resolver': {
                typescript: {
                    project: ['./tsconfig.json']
                }
            }
        },
        rules: {
            '@typescript-eslint/array-type': ['error', { default: 'array-simple', readonly: 'array-simple' }],
            '@typescript-eslint/no-restricted-types': [
                'error',
                {
                    types: {
                        Object: {
                            message: 'Avoid using the `Object` type. Did you mean `object`?'
                        },
                        Function: {
                            message: 'Avoid using the `Function` type. Prefer a specific function type, like `() => void`.'
                        },
                        Boolean: {
                            message: 'Avoid using the `Boolean` type. Did you mean `boolean`?'
                        },
                        Number: {
                            message: 'Avoid using the `Number` type. Did you mean `number`?'
                        },
                        String: {
                            message: 'Avoid using the `String` type. Did you mean `string`?'
                        }
                    }
                }
            ],
            '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
            '@typescript-eslint/consistent-indexed-object-style': 'off',
            '@typescript-eslint/consistent-type-assertions': 'off',
            '@typescript-eslint/no-duplicate-enum-values': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-inferrable-types': 'off',
            '@typescript-eslint/no-namespace': 'off',
            '@typescript-eslint/no-require-imports': 'off',
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }
            ],
            '@typescript-eslint/naming-convention': [
                'error',
                {
                    selector: 'interface',
                    format: ['PascalCase'],
                    custom: {
                        regex: '^I[A-Z]',
                        match: false
                    }
                }
            ],
            'dot-notation': 'error',
            semi: ['error', 'always'],
            'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
            'jsdoc/check-alignment': 'off',
            'jsdoc/check-indentation': 'off',
            'no-trailing-spaces': ['error', { skipBlankLines: false, ignoreComments: false }],
            'no-var': 'off',
            'prefer-rest-params': 'off',
            'prefer-const': 'off',
            quotes: ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }]
        }
    }
);
