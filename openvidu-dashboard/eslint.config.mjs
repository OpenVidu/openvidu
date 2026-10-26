// @ts-check
import js from '@eslint/js';
import angular from 'angular-eslint';
import prettier from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
	globalIgnores(['**/node_modules/', '**/dist/', '**/.angular/', '**/coverage/']),
	{
		files: ['**/*.{js,mjs,cjs}'],
		extends: [js.configs.recommended],
		languageOptions: {
			globals: globals.node
		}
	},
	{
		files: ['**/*.ts'],
		extends: [js.configs.recommended, tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname
			},
			globals: globals.node
		},
		rules: {
			'@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
			'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
			curly: 'error',
			eqeqeq: ['error', 'always'],
			'padding-line-between-statements': [
				'error',
				{ blankLine: 'always', prev: '*', next: ['if', 'for', 'while', 'switch', 'try', 'return'] },
				{ blankLine: 'always', prev: ['if', 'for', 'while', 'switch', 'try'], next: '*' }
			]
		}
	},
	{
		files: ['dashboard-*/frontend/**/*.ts'],
		extends: [angular.configs.tsRecommended],
		processor: angular.processInlineTemplates,
		languageOptions: {
			globals: globals.browser
		},
		rules: {
			'@angular-eslint/component-selector': ['error', { type: 'element', prefix: 'ovd', style: 'kebab-case' }],
			'@angular-eslint/directive-selector': ['error', { type: 'attribute', prefix: 'ovd', style: 'camelCase' }],
			'@angular-eslint/no-uncalled-signals': 'error',
			'@angular-eslint/prefer-output-readonly': 'error',
			'@angular-eslint/prefer-signals': 'error',
			'@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }]
		}
	},
	{
		files: ['dashboard-*/frontend/**/*.html'],
		extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
		rules: {
			'@angular-eslint/template/button-has-type': 'error',
			'@angular-eslint/template/prefer-control-flow': 'error',
			'@angular-eslint/template/prefer-self-closing-tags': 'error'
		}
	},
	prettier
]);
