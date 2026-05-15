import type { Program } from 'estree'

import type {
  ComponentInfo,
  ComponentResolverObject,
  FilterPattern,
} from '../types'

export type ResolveKind = 'component' | 'action'

export interface ResolvedOptions {
  include: Array<string | RegExp>
  exclude: Array<string | RegExp>
  excludeNames: Array<string | RegExp>
  dirs: string[]
  extensions: string[]
  globs: string[]
  globsExclude: string[]
  customGlobs: boolean
  deep: boolean
  directoryAsNamespace: boolean
  prefix: string
  allowOverrides: boolean
  resolvers: ComponentResolverObject[]
  importPathTransform: (path: string) => string | undefined
  actions: boolean
  sourcemap: boolean
  dts: string | false
  dumpComponentsInfo: string | false
}

export interface LocalComponent {
  name: string
  path: string
}

export interface DeclarationComponent extends ComponentInfo {
  as: string
  type: ResolveKind
}

export interface ComponentWatcher {
  on: (event: 'add' | 'unlink', cb: (path: string) => void) => void
}

export type ScriptProgram = Program | null | undefined

export type FilterPatternInput = FilterPattern | undefined
