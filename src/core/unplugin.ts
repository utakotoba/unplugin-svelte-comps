import { createUnplugin } from 'unplugin'

import type { Options } from '../types'

export default createUnplugin<Options | undefined>((options = {}) => {
  const include = toArray(options.include ?? /\.svelte(?:\?.*)?$/)
  const exclude = toArray(
    options.exclude ?? [/[\\/]node_modules[\\/]/, /[\\/]\.git[\\/]/],
  )

  return {
    name: 'unplugin-svelte-comps',
    enforce: 'pre',
    transformInclude(id) {
      return matches(include, id) && !matches(exclude, id)
    },
    transform() {
      return null
    },
  }
})

function toArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value]
}

function matches(patterns: Array<string | RegExp>, id: string): boolean {
  return patterns.some((pattern) => {
    if (typeof pattern === 'string') return id.includes(pattern)

    pattern.lastIndex = 0
    return pattern.test(id)
  })
}
