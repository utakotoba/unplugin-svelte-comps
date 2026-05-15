import { relative, resolve } from 'node:path'

import { cleanId, isInside, matches, pascalCase, slash } from './utils'
import type {
  DeclarationComponent,
  LocalComponent,
  ResolvedOptions,
} from './types'
import type {
  ComponentInfo,
  ComponentResolveResult,
  ImportInfo,
  SideEffectsInfo,
} from '../types'

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

export function stringifyImport(as: string, info: ComponentInfo): string {
  const imports: string[] = stringifySideEffects(info.sideEffects)
  if (!info.name || info.name === 'default')
    imports.push(`import ${as} from '${info.from}';`)
  else if (info.name === as)
    imports.push(`import { ${as} } from '${info.from}';`)
  else imports.push(`import { ${info.name} as ${as} } from '${info.from}';`)
  return imports.join('\n')
}

export function stringifyTypeofImport(info: ImportInfo, dtsPath: string) {
  const from = transformPath(info.from, (path) =>
    path.startsWith('/')
      ? `./${slash(relative(resolve(dtsPath, '..'), path))}`
      : path,
  )

  return `typeof import('${from}')['${info.name || 'default'}']`
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
  if (matches(options.excludeNames, name)) return
  if (!name) return

  return {
    name,
    path: slash(resolve(root, path)),
  }
}

export function toDeclarationComponent(
  component: LocalComponent,
): DeclarationComponent {
  return {
    as: component.name,
    from: component.path,
    type: 'component',
  }
}

export function transformComponentInfo(
  info: ComponentInfo,
  transform: ResolvedOptions['importPathTransform'],
): ComponentInfo {
  return {
    ...info,
    from: transformPath(info.from, transform),
    sideEffects: transformSideEffects(info.sideEffects, transform),
  }
}

function stringifySideEffects(sideEffects: SideEffectsInfo): string[] {
  return toSideEffectArray(sideEffects).map((sideEffect) => {
    if (typeof sideEffect === 'string') return `import '${sideEffect}';`
    if (!sideEffect.name || sideEffect.name === 'default')
      return `import '${sideEffect.from}';`
    return stringifyImport(sideEffect.name, sideEffect)
  })
}

function toSideEffectArray(
  sideEffects: SideEffectsInfo,
): Array<ImportInfo | string> {
  if (!sideEffects) return []
  return Array.isArray(sideEffects) ? sideEffects : [sideEffects]
}

function transformPath(
  path: string,
  transform: (path: string) => string | undefined,
) {
  return transform(path) ?? path
}

function transformSideEffects(
  sideEffects: SideEffectsInfo,
  transform: ResolvedOptions['importPathTransform'],
): SideEffectsInfo {
  const transformed = toSideEffectArray(sideEffects).map((sideEffect) =>
    typeof sideEffect === 'string'
      ? transformPath(sideEffect, transform)
      : { ...sideEffect, from: transformPath(sideEffect.from, transform) },
  )
  return Array.isArray(sideEffects) ? transformed : transformed[0]
}
