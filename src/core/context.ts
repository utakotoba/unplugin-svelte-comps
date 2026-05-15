import process from 'node:process'
import { resolve } from 'node:path'

import type { TransformResult } from 'unplugin'
import { glob } from 'tinyglobby'
import { parse } from 'svelte/compiler'
import MagicString from 'magic-string'
import type { FSWatcher } from 'chokidar'
import { watch } from 'chokidar'

import { cleanId, matches, slash } from './utils'
import type {
  ComponentWatcher,
  DeclarationComponent,
  LocalComponent,
  ResolvedOptions,
} from './types'
import {
  collectBindings,
  findUsedComponents,
  getScriptInsert,
} from './transform'
import { resolveOptions } from './options'
import { writeDeclaration } from './declaration'
import {
  isComponentPath,
  normalizeResolveResult,
  stringifyImport,
  toDeclarationComponent,
  toImportPath,
  toLocalComponent,
} from './components'
import type { ComponentInfo, Options } from '../types'

export class Context {
  root = process.cwd()
  options: ResolvedOptions

  private components = new Map<string, LocalComponent>()
  private resolvedComponents = new Map<string, ComponentInfo>()
  private scanned = false
  private watcher: FSWatcher | undefined
  private declarationTimer: ReturnType<typeof setTimeout> | undefined

  constructor(private rawOptions: Options) {
    this.options = resolveOptions(rawOptions, this.root)
  }

  setRoot(root: string) {
    this.root = root
    this.options = resolveOptions(this.rawOptions, root)
    this.scanned = false
    void this.watcher?.close()
    this.watcher = undefined
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

  async generateDeclaration() {
    await writeDeclaration(this.options.dts, this.getDeclarationComponents())
  }

  setupWatcher(watcher: ComponentWatcher) {
    watcher.on('add', (path) => {
      const absPath = slash(resolve(this.root, path))
      if (isComponentPath(absPath, this.options)) this.addComponent(absPath)
    })
    watcher.on('unlink', (path) => {
      this.removeComponent(slash(resolve(this.root, path)))
    })
  }

  setupChokidar(addWatchFile?: (file: string) => void) {
    if (this.watcher) return

    this.watcher = watch(this.options.globs, {
      ignored: this.options.globsExclude,
      ignoreInitial: true,
      persistent: false,
    })
      .on('add', (path) => {
        const absPath = slash(resolve(this.root, path))
        if (!isComponentPath(absPath, this.options)) return
        if (this.addComponent(absPath)) addWatchFile?.(absPath)
      })
      .on('unlink', (path) => {
        this.removeComponent(slash(resolve(this.root, path)))
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
      if (result) {
        const component = normalizeResolveResult(result)
        this.addResolvedComponent(name, component)
        return component
      }
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
    collectBindings(declared, ast.module?.content)
    collectBindings(declared, ast.instance?.content)

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
    if (!component) return false
    if (!this.options.allowOverrides && this.components.has(component.name))
      return false
    this.components.set(component.name, component)
    this.scheduleDeclaration()
    return true
  }

  private addResolvedComponent(name: string, component: ComponentInfo) {
    const current = this.resolvedComponents.get(name)
    if (current?.from === component.from && current.name === component.name)
      return

    this.resolvedComponents.set(name, component)
    this.scheduleDeclaration()
  }

  private getDeclarationComponents(): DeclarationComponent[] {
    return [
      ...Array.from(this.components.values(), toDeclarationComponent),
      ...Array.from(this.resolvedComponents, ([as, component]) => ({
        as,
        ...component,
      })),
    ]
  }

  private removeComponent(path: string) {
    let changed = false
    for (const [name, component] of this.components) {
      if (component.path !== path) continue
      this.components.delete(name)
      changed = true
    }
    if (changed) this.scheduleDeclaration()
  }

  private scheduleDeclaration() {
    if (!this.options.dts) return
    clearTimeout(this.declarationTimer)
    this.declarationTimer = setTimeout(() => {
      void this.generateDeclaration()
    }, 100)
  }
}
