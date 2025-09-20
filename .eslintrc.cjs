module.exports = {
  env: { node: true, es2021: true, jest: true },
  extends: ['eslint:recommended', 'plugin:sonarjs/recommended', 'plugin:jsdoc/recommended'],
  plugins: ['sonarjs','jsdoc'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  rules: {
    'sonarjs/cognitive-complexity': ['error', 10],
    'no-unused-vars': ['warn'],
    
    'jsdoc/require-jsdoc': [
      'error',
      {
        'require': {
          'FunctionDeclaration': true,
          'MethodDefinition': true,
          'ClassDeclaration': true,
          'ArrowFunctionExpression': true,
          'FunctionExpression': true
        }
      }
    ],
    // JSDoc 内でパラメータ・戻り値の記載を必須化
    'jsdoc/require-param': 'error',
    'jsdoc/require-returns': 'error'
  }
};
