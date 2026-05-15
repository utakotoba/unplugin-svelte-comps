import { isAbsolute, resolve } from 'node:path'

import { slash, toArray } from './utils'
import type { ResolvedOptions } from './types'
import { DEFAULT_EXCLUDE, DEFAULT_INCLUDE } from './constants'
import type {
  ComponentResolver,
  ComponentResolverObject,
  Options,
} from '../types'

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
  const globsExclude = toArray(options.globsExclude ?? []).map((glob) =>
    resolveGlob(root, glob),
  )

  return {
    include: toArray(options.include ?? DEFAULT_INCLUDE),
    exclude: toArray(options.exclude ?? DEFAULT_EXCLUDE),
    excludeNames: toArray(options.excludeNames ?? []),
    dirs,
    extensions,
    globs: globs
      .map((glob) => resolveGlob(root, glob))
      .filter((glob) => {
        if (!glob.startsWith('!')) return true
        globsExclude.push(glob.slice(1))
        return false
      }),
    globsExclude,
    customGlobs,
    deep,
    directoryAsNamespace: options.directoryAsNamespace ?? false,
    prefix: options.prefix ?? '',
    allowOverrides: options.allowOverrides ?? false,
    resolvers: normalizeResolvers(options.resolvers),
    importPathTransform: options.importPathTransform ?? ((path) => path),
    actions: options.actions ?? true,
    sourcemap: options.sourcemap ?? true,
    dts:
      options.dts === false
        ? false
        : resolve(
            root,
            typeof options.dts === 'string' ? options.dts : 'components.d.ts',
          ),
    dumpComponentsInfo:
      options.dumpComponentsInfo === true
        ? resolve(root, '.components-info.json')
        : typeof options.dumpComponentsInfo === 'string'
          ? resolve(root, options.dumpComponentsInfo)
          : false,
  }
}

function resolveGlob(root: string, glob: string) {
  const negated = glob.startsWith('!')
  const value = negated ? glob.slice(1) : glob
  const resolved = isAbsolute(value) ? value : resolve(root, value)
  return slash(`${negated ? '!' : ''}${resolved}`)
}

function normalizeResolvers(
  options: Options['resolvers'],
): ComponentResolverObject[] {
  return flattenResolvers(options ?? []).map((resolver) =>
    typeof resolver === 'function'
      ? { type: 'component', resolve: resolver }
      : resolver,
  )
}

function flattenResolvers(
  resolvers:
    | ComponentResolver
    | ComponentResolver[]
    | (ComponentResolver | ComponentResolver[])[],
): ComponentResolver[] {
  return toArray(resolvers).flatMap((resolver) =>
    Array.isArray(resolver) ? resolver : [resolver],
  )
}
