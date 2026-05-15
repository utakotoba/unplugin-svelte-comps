export type FilterPattern = string | RegExp | Array<string | RegExp>

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
}
