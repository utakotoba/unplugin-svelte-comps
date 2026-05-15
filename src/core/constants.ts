export const PLUGIN_NAME = 'unplugin-svelte-comps'

export const DEFAULT_INCLUDE = [
  /\.svelte$/,
  /\.svelte\?(?:.*&)?svelte(?:&.*)?$/,
  /\.svelte\?v=.*$/,
]

export const DEFAULT_EXCLUDE = [/[\\/]node_modules[\\/]/, /[\\/]\.git[\\/]/]

export const DEFAULT_DIRS = 'src/lib/components'

export const DEFAULT_EXTENSIONS = 'svelte'

export const DEFAULT_DEEP = true

export const DEFAULT_DIRECTORY_AS_NAMESPACE = false

export const DEFAULT_PREFIX = ''

export const DEFAULT_ALLOW_OVERRIDES = false

export const DEFAULT_ACTIONS = true

export const DEFAULT_SOURCEMAP = true

export const DEFAULT_DTS = 'components.d.ts'

export const DEFAULT_COMPONENTS_INFO = '.components-info.json'

export const DISABLE_COMMENT = '/* unplugin-svelte-comps disabled */'
