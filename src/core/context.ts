import process from 'node:process'
import { resolve } from 'node:path'

import type { TransformResult } from 'unplugin'
import { glob } from 'tinyglobby'
import { parse } from 'svelte/compiler'
import MagicString from 'magic-string'

import { cleanId, matches, slash } from './utils'
import type {
  ComponentWatcher,
  LocalComponent,
  Program,
  ResolvedOptions,
} from './types'
import {
  collectBindings,
  findUsedComponents,
  getScriptInsert,
} from './transform'
import { resolveOptions } from './options'
import {
  isComponentPath,
  normalizeResolveResult,
  stringifyImport,
  toImportPath,
  toLocalComponent,
} from './components'
import type { ComponentInfo, Options } from '../types'

export class Context {
  root = process.cwd()
  options: ResolvedOptions

  private components = new Map<string, LocalComponent>()
  private scanned = false

  constructor(private rawOptions: Options) {
    this.options = resolveOptions(rawOptions, this.root)
  }

  setRoot(root: string) {
    this.root = root
    this.options = resolveOptions(this.rawOptions, root)
    this.scanned = false
  }

  shouldTransform(id: string) {
    return (
      matches(this.options.include, id) && !matches(this.options.exclude, id)
    )
  }

  async search() {
    if (this.scanned) return
    this.components.clear()

    const files = await glob(this.options.globs, {
      cwd: this.root,
      absolute: true,
      ignore: this.options.globsExclude,
      onlyFiles: true,
    })

    for (const file of files) this.addComponent(file)
    this.scanned = true
  }

  setupWatcher(watcher: ComponentWatcher) {
    watcher.on('add', (path) => {
      const absPath = slash(resolve(this.root, path))
      if (isComponentPath(absPath, this.options)) this.addComponent(absPath)
    })
    watcher.on('unlink', (path) => {
      const absPath = slash(resolve(this.root, path))
      for (const [name, component] of this.components) {
        if (component.path === absPath) this.components.delete(name)
      }
    })
  }

  getComponentFiles() {
    return Array.from(this.components.values(), (component) => component.path)
  }

  async findComponent(
    name: string,
    importer: string,
  ): Promise<ComponentInfo | undefined> {
    await this.search()

    const local = this.components.get(name)
    if (local && local.path !== cleanId(importer))
      return { from: toImportPath(local.path, importer) }

    for (const resolver of this.options.resolvers) {
      const result = await resolver(name, importer)
      if (result) return normalizeResolveResult(result)
    }
  }

  async transform(code: string, id: string): Promise<TransformResult> {
    if (!this.shouldTransform(id) || !/<[A-Z]/.test(code)) return null

    await this.search()

    const filename = cleanId(id)
    const ast = parse(code, { filename, modern: true })
    const names = findUsedComponents(ast.fragment)
    if (!names.size) return null

    const declared = new Set<string>()
    collectBindings(declared, ast.module?.content as Program)
    collectBindings(declared, ast.instance?.content as Program)

    const imports: string[] = []
    for (const name of names) {
      if (declared.has(name)) continue

      const component = await this.findComponent(name, filename)
      if (!component) continue

      imports.push(stringifyImport(name, component))
      declared.add(name)
    }

    if (!imports.length) return null

    const s = new MagicString(code)
    const block = `${imports.join('\n')}\n`

    if (ast.instance) {
      const { pos, content } = getScriptInsert(code, ast.instance)
      s.prependLeft(pos, content + block)
    } else s.prepend(`<script>\n${block}</script>\n\n`)

    return {
      code: s.toString(),
      map: this.options.sourcemap
        ? s.generateMap({ hires: true, source: filename })
        : null,
    }
  }

  private addComponent(path: string) {
    const component = toLocalComponent(path, this.options, this.root)
    if (!component) return
    if (!this.options.allowOverrides && this.components.has(component.name))
      return
    this.components.set(component.name, component)
  }
}
