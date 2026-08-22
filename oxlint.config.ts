import { defineConfig } from 'oxlint'

export default defineConfig({
  plugins: ['import', 'vue', 'jsx-a11y', 'oxc', 'typescript'],
  rules: {
    'eslint/no-unused-expressions': [
      'error',
      {
        allowShortCircuit: true,
      },
    ],
    // V2 基线仍含大量运行时兼容导入；渐进迁移前不将样式规则升级为合并阻断项。
    'typescript/consistent-type-imports': 'off',
    'import/consistent-type-specifier-style': 'off',
    'typescript/no-redundant-type-constituents': 'off',
  },
  ignorePatterns: ['*.min.js', '/packages', '/.claude'],
  options: {
    typeAware: true,
  },
})
