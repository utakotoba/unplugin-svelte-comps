import type { TransformResult } from 'unplugin'

export type Awaitable<T> = T | Promise<T>
export type FilterPattern = string | RegExp | Array<string | RegExp>

export interface ComponentInfo {
  /** Import source for the component. */
  from: string

  /** Named export to import. Defaults to the module's default export. */
  name?: string
}

export type ComponentResolveResult =
  | string
  | ComponentInfo
  | null
  | undefined
  | void

export type ComponentResolver = (
  name: string,
  importer: string,
) => Awaitable<ComponentResolveResult>

export interface Options {
  /**
   * Files this plugin should consider for Svelte component auto-import
   * transforms.
   *
   * @default /\.svelte(?:\?.*)?$/
   */
  include?: FilterPattern

  /**
   * Files this plugin should ignore.
   *
   * @default [/node_modules/, /\.git/]
   */
  exclude?: FilterPattern

  /**
   * Directories to scan for local Svelte components.
   *
   * @default 'src/components'
   */
  dirs?: string | string[]

  /**
   * File extensions to include while scanning component directories.
   *
   * @default 'svelte'
   */
  extensions?: string | string[]

  /** Glob patterns to use instead of deriving them from `dirs`. */
  globs?: string | string[]

  /**
   * Glob patterns to exclude from component discovery.
   *
   * @default [ ]
   */
  globsExclude?: string | string[]

  /**
   * Search component directories recursively.
   *
   * @default true
   */
  deep?: boolean

  /**
   * Include subdirectory names in the generated component name.
   *
   * @default false
   */
  directoryAsNamespace?: boolean

  /** Prefix every discovered local component name. */
  prefix?: string

  /**
   * Allow later discovered components to replace earlier components with the
   * same generated name.
   *
   * @default false
   */
  allowOverrides?: boolean

  /** Resolve components from libraries or virtual modules. */
  resolvers?: ComponentResolver | ComponentResolver[]

  /**
   * Generate a sourcemap for transformed Svelte files.
   *
   * @default true
   */
  sourcemap?: boolean
}

export interface PublicPluginAPI {
  findComponent: (
    name: string,
    importer: string,
  ) => Promise<ComponentInfo | undefined>
  transform: (code: string, id: string) => Promise<TransformResult>
}
