import { relative, resolve } from 'node:path'

import { cleanId, isInside, pascalCase, slash } from './utils'
import type { LocalComponent, ResolvedOptions } from './types'
import type { ComponentInfo, ComponentResolveResult } from '../types'

export function isComponentPath(path: string, options: ResolvedOptions) {
  const normalized = slash(resolve(path))
  return (
    options.extensions.some((extension) =>
      normalized.endsWith(`.${extension}`),
    ) &&
    (options.customGlobs ||
      options.dirs.some((dir) => isInside(normalized, dir)))
  )
}

export function normalizeResolveResult(
  result: Exclude<ComponentResolveResult, null | undefined | void>,
) {
  return typeof result === 'string' ? { from: result } : result
}

export function stringifyImport(as: string, info: ComponentInfo) {
  if (!info.name || info.name === 'default')
    return `import ${as} from '${info.from}';`
  if (info.name === as) return `import { ${as} } from '${info.from}';`
  return `import { ${info.name} as ${as} } from '${info.from}';`
}

export function toImportPath(path: string, importer: string) {
  let resolved = slash(relative(resolve(cleanId(importer), '..'), path))
  if (!resolved.startsWith('.')) resolved = `./${resolved}`
  return resolved
}

export function toLocalComponent(
  path: string,
  options: ResolvedOptions,
  root: string,
): LocalComponent | undefined {
  path = slash(resolve(path))
  const ext = options.extensions.find((extension) =>
    path.endsWith(`.${extension}`),
  )
  if (!ext) return

  const dir =
    options.dirs.find((candidate) => isInside(path, candidate)) ??
    (options.customGlobs ? root : undefined)
  if (!dir) return

  const relativePath = slash(relative(dir, path)).slice(0, -ext.length - 1)
  let parts = relativePath.split('/').filter(Boolean)
  const fileName = parts.at(-1)

  if (!options.directoryAsNamespace && fileName)
    parts = [fileName === 'index' ? (parts.at(-2) ?? fileName) : fileName]
  else if (fileName === 'index') parts = parts.slice(0, -1)

  const name = pascalCase(`${options.prefix}-${parts.join('-')}`)
  if (!name) return

  return {
    name,
    path: slash(resolve(root, path)),
  }
}
