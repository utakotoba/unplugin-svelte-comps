import { isAbsolute, resolve } from 'node:path'

import { slash, toArray } from './utils'
import type { ResolvedOptions } from './types'
import {
  DEFAULT_ACTIONS,
  DEFAULT_ALLOW_OVERRIDES,
  DEFAULT_COMPONENTS_INFO,
  DEFAULT_DEEP,
  DEFAULT_DIRECTORY_AS_NAMESPACE,
  DEFAULT_DIRS,
  DEFAULT_DTS,
  DEFAULT_EXCLUDE,
  DEFAULT_EXTENSIONS,
  DEFAULT_INCLUDE,
  DEFAULT_PREFIX,
  DEFAULT_SOURCEMAP,
} from './constants'
import type {
  ComponentResolver,
  ComponentResolverObject,
  Options,
} from '../types'

export function resolveOptions(
  options: Options,
  root: string,
): ResolvedOptions {
  const dirs = toArray(options.dirs ?? DEFAULT_DIRS).map((dir) =>
    slash(resolve(root, dir)),
  )
  const extensions = toArray(options.extensions ?? DEFAULT_EXTENSIONS).map(
    (extension) => extension.replace(/^\./, ''),
  )
  const extensionGlob =
    extensions.length === 1 ? extensions[0] : `{${extensions.join(',')}}`
  const deep = options.deep ?? DEFAULT_DEEP
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
    directoryAsNamespace:
      options.directoryAsNamespace ?? DEFAULT_DIRECTORY_AS_NAMESPACE,
    prefix: options.prefix ?? DEFAULT_PREFIX,
    allowOverrides: options.allowOverrides ?? DEFAULT_ALLOW_OVERRIDES,
    resolvers: normalizeResolvers(options.resolvers),
    importPathTransform: options.importPathTransform ?? ((path) => path),
    actions: options.actions ?? DEFAULT_ACTIONS,
    sourcemap: options.sourcemap ?? DEFAULT_SOURCEMAP,
    dts:
      options.dts === false
        ? false
        : resolve(
            root,
            typeof options.dts === 'string' ? options.dts : DEFAULT_DTS,
          ),
    dumpComponentsInfo:
      options.dumpComponentsInfo === true
        ? resolve(root, DEFAULT_COMPONENTS_INFO)
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
