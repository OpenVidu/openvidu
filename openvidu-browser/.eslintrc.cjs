module.exports = {
    root: true,
    ignorePatterns: ['lib/**', 'ts4.4/**', 'node_modules/**', 'static/**', 'openvidu-browser-*.tgz'],
    env: {
        browser: true,
        es2020: true,
        node: true
    },
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module'
    },
    plugins: ['@typescript-eslint', 'import'],
    extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:import/recommended', 'plugin:import/typescript'],
    settings: {
        'import/resolver': {
            node: {
                extensions: ['.js', '.ts']
            },
            typescript: {
                project: ['./tsconfig.json', './src/OpenVidu/tsconfig.json']
            }
        }
    },
    rules: {
        '@typescript-eslint/array-type': ['error', { default: 'array' }],
        '@typescript-eslint/ban-types': [
            'error',
            {
                extendDefaults: true,
                types: {
                    Object: {
                        message: 'Avoid using the `Object` type. Did you mean `object`?',
                        fixWith: 'object'
                    },
                    Function: {
                        message: 'Avoid using the `Function` type. Prefer a specific function type.'
                    },
                    Boolean: {
                        message: 'Avoid using the `Boolean` type. Did you mean `boolean`?',
                        fixWith: 'boolean'
                    },
                    Number: {
                        message: 'Avoid using the `Number` type. Did you mean `number`?',
                        fixWith: 'number'
                    },
                    String: {
                        message: 'Avoid using the `String` type. Did you mean `string`?',
                        fixWith: 'string'
                    }
                }
            }
        ],
        '@typescript-eslint/no-empty-interface': 'off',
        '@typescript-eslint/no-inferrable-types': 'error',
        '@typescript-eslint/no-namespace': 'off',
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/type-annotation-spacing': 'error',
        curly: ['error', 'multi-line', 'consistent'],
        eqeqeq: ['error', 'always'],
        'import/no-extraneous-dependencies': [
            'error',
            {
                devDependencies: ['config/**', '**/*.spec.ts', '**/*.test.ts']
            }
        ],
        'no-trailing-spaces': ['error', { skipBlankLines: false, ignoreComments: false }],
        'no-var': 'error',
        'object-shorthand': ['error', 'always'],
        'prefer-const': 'error',
        quotes: ['error', 'single', { avoidEscape: true, allowTemplateLiterals: false }],
        semi: ['error', 'always'],
        'space-in-parens': 'off'
    }
};
