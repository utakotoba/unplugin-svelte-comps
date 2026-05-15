import { createUnplugin } from 'unplugin'

import { Context } from './context'
import { PLUGIN_NAME } from './constants'
import type { Options, PublicPluginAPI } from '../types'

export default createUnplugin<Options | undefined>((options = {}) => {
  const ctx = new Context(options)
  const api: PublicPluginAPI = {
    findComponent: (name, importer) => ctx.findComponent(name, importer),
    transform: (code, id) => ctx.transform(code, id),
  }

  return {
    name: PLUGIN_NAME,
    enforce: 'pre',
    api,
    transformInclude(id) {
      return ctx.shouldTransform(id)
    },
    async buildStart() {
      await ctx.search()
      await ctx.generateDeclaration()
      for (const file of ctx.getComponentFiles()) this.addWatchFile(file)
      ctx.setupChokidar((file) => this.addWatchFile(file))
    },
    async transform(code, id) {
      return await ctx.transform(code, id)
    },
    vite: {
      configResolved(config) {
        ctx.setRoot(config.root)
      },
      configureServer(server) {
        ctx.setupWatcher(server.watcher)
      },
    },
  }
})
