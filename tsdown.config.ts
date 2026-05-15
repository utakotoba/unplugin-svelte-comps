import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: 'src/index.ts',
  format: ['es', 'cjs'],
  dts: { tsgo: true },
  tsconfig: './tsconfig.json',
})
