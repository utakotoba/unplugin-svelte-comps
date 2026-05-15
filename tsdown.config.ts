import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/*.ts'],
  format: ['es'],
  exports: true,
  dts: { tsgo: true },
  tsconfig: './tsconfig.json',
  deps: {
    neverBundle: [
      // dts
      'esbuild',
      'rollup',
      'rolldown',
      'vite',
    ],
  },
})
