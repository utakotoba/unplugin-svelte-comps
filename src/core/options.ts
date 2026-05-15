import { resolve } from 'node:path'

import { slash, toArray } from './utils'
import type { ResolvedOptions } from './types'
import { DEFAULT_EXCLUDE, DEFAULT_INCLUDE } from './constants'
import type { Options } from '../types'

export function resolveOptions(
  options: Options,
  root: string,
): ResolvedOptions {
  const dirs = toArray(options.dirs ?? 'src/components').map((dir) =>
    slash(resolve(root, dir)),
  )
  const extensions = toArray(options.extensions ?? 'svelte').map((extension) =>
    extension.replace(/^\./, ''),
  )
  const extensionGlob =
    extensions.length === 1 ? extensions[0] : `{${extensions.join(',')}}`
  const deep = options.deep ?? true
  const customGlobs = options.globs != null
  const globs = !customGlobs
    ? dirs.map((dir) => `${dir}/${deep ? '**/' : ''}*.${extensionGlob}`)
    : toArray(options.globs as string | string[])

  return {
    include: toArray(options.include ?? DEFAULT_INCLUDE),
    exclude: toArray(options.exclude ?? DEFAULT_EXCLUDE),
    dirs,
    extensions,
    globs: globs.map(slash),
    globsExclude: toArray(options.globsExclude ?? []).map(slash),
    customGlobs,
    deep,
    directoryAsNamespace: options.directoryAsNamespace ?? false,
    prefix: options.prefix ?? '',
    allowOverrides: options.allowOverrides ?? false,
    resolvers: toArray(options.resolvers ?? []),
    sourcemap: options.sourcemap ?? true,
  }
}
