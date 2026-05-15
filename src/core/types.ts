import type { Program } from 'estree'

import type { ComponentInfo, ComponentResolver } from '../types'

export interface ResolvedOptions {
  include: Array<string | RegExp>
  exclude: Array<string | RegExp>
  dirs: string[]
  extensions: string[]
  globs: string[]
  globsExclude: string[]
  customGlobs: boolean
  deep: boolean
  directoryAsNamespace: boolean
  prefix: string
  allowOverrides: boolean
  resolvers: ComponentResolver[]
  sourcemap: boolean
  dts: string | false
}

export interface LocalComponent {
  name: string
  path: string
}

export interface DeclarationComponent extends ComponentInfo {
  as: string
}

export interface ComponentWatcher {
  on: (event: 'add' | 'unlink', cb: (path: string) => void) => void
}

export type ScriptProgram = Program | null | undefined
