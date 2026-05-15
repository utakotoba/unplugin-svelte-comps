import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/*.ts'],
  format: ['es'],
  exports: true,
  dts: { tsgo: true },
  tsconfig: './tsconfig.json',
  deps: {
    neverBundle: [
      '@rspack/core',
      'chokidar',
      'esbuild',
      'magic-string',
      'rolldown',
      'rollup',
      'svelte',
      'svelte/compiler',
      'tinyglobby',
      'unplugin',
      'vite',
    ],
  },
})
