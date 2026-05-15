import type { TransformResult } from 'unplugin'

export type Awaitable<T> = T | Promise<T>
export type FilterPattern = string | RegExp | Array<string | RegExp>

export interface ImportInfo {
  /** Local binding name to use for declarations and component info. */
  as?: string

  /** Import source for the component. */
  from: string

  /** Named export to import. Defaults to the module's default export. */
  name?: string
}

export type SideEffectsInfo =
  | (ImportInfo | string)[]
  | ImportInfo
  | string
  | undefined

export interface ComponentInfo extends ImportInfo {
  sideEffects?: SideEffectsInfo
}

export type ComponentResolveResult =
  | string
  | ComponentInfo
  | null
  | undefined
  | void

export type ComponentResolverFunction = (
  name: string,
  importer: string,
) => Awaitable<ComponentResolveResult>

export interface ComponentResolverObject {
  type: 'component' | 'action'
  resolve: ComponentResolverFunction
}

export type ComponentResolver =
  | ComponentResolverFunction
  | ComponentResolverObject

export type ResolversOption =
  | ComponentResolver
  | ComponentResolver[]
  | (ComponentResolver | ComponentResolver[])[]

export interface Options {
  /**
   * Files this plugin should consider for Svelte component auto-import
   * transforms.
   *
   * @default DEFAULT_INCLUDE, covering plain `.svelte` and Vite Svelte query ids.
   */
  include?: FilterPattern

  /**
   * Files this plugin should ignore.
   *
   * @default [/node_modules/, /\.git/]
   */
  exclude?: FilterPattern

  /** RegExp or glob to match component/action names that will NOT be imported. */
  excludeNames?: FilterPattern

  /**
   * Directories to scan for local Svelte components.
   *
   * @default 'src/lib/components'
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
  resolvers?: ResolversOption

  /** Apply a custom transform over import paths. */
  importPathTransform?: (path: string) => string | undefined

  /**
   * Auto import Svelte actions used as `use:name`.
   *
   * @default true
   */
  actions?: boolean

  /**
   * Generate a sourcemap for transformed Svelte files.
   *
   * @default true
   */
  sourcemap?: boolean

  /**
   * Generate global component declarations for type-safe editor usage.
   *
   * @default 'components.d.ts'
   */
  dts?: boolean | string

  /**
   * Save component/action information into a JSON file for other tools.
   *
   * @default false
   */
  dumpComponentsInfo?: boolean | string
}

export interface PublicPluginAPI {
  /** Resolves a component using configured local discovery and resolvers. */
  findComponent: (
    name: string,
    importer?: string,
  ) => Promise<ComponentInfo | undefined>

  /** Resolves a Svelte action used as `use:name`. */
  findAction: (
    name: string,
    importer?: string,
  ) => Promise<ComponentInfo | undefined>

  /** Obtain an import statement for a resolved component or action. */
  stringifyImport: (info: ComponentInfo) => string

  transform: (code: string, id: string) => Promise<TransformResult>
}
