import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

export default defineConfigWithVueTs (
  {
    name: 'app/files-to-lint',
    files: [''],
    // files: ['**/*.{js,mjs,jsx,vue}'],
  },

  {
    name: 'app/files-to-ignore',
    files: ['**/*.{js,mjs,jsx,vue}'],
    // ignores: ['**/dist/**', '**/dist-ssr/**', '**/coverage/**'],
  },

  vueTsConfigs.recommended,
  ...pluginVue.configs['flat/essential'],
  skipFormatting,
)
