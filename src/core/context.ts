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
  ResolveKind,
  ResolvedOptions,
} from './types'
import {
  collectBindings,
  findUsedActions,
  findUsedComponents,
  getScriptInsert,
} from './transform'
import { resolveOptions } from './options'
import { writeComponentsInfo } from './info'
import { writeDeclaration } from './declaration'
import { DISABLE_COMMENT } from './constants'
import {
  isComponentPath,
  normalizeResolveResult,
  stringifyImport,
  toDeclarationComponent,
  toImportPath,
  toLocalComponent,
  transformComponentInfo,
} from './components'
import type { ComponentInfo, Options } from '../types'

export class Context {
  root = process.cwd()
  options: ResolvedOptions

  private components = new Map<string, LocalComponent>()
  private resolvedComponents = new Map<string, ComponentInfo>()
  private resolvedActions = new Map<string, ComponentInfo>()
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

  async generateComponentsInfo() {
    await writeComponentsInfo(
      this.options.dumpComponentsInfo,
      this.getDeclarationComponents(),
    )
  }

  async generateFiles() {
    await Promise.all([
      this.generateDeclaration(),
      this.generateComponentsInfo(),
    ])
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
    return await this.findResolved(name, 'component', importer)
  }

  async findAction(
    name: string,
    importer: string,
  ): Promise<ComponentInfo | undefined> {
    return await this.findResolved(name, 'action', importer)
  }

  stringifyImport(info: ComponentInfo) {
    return stringifyImport(info.as || info.name || 'default', info)
  }

  async findResolved(
    name: string,
    kind: ResolveKind,
    importer: string,
  ): Promise<ComponentInfo | undefined> {
    if (matches(this.options.excludeNames, name)) return
    await this.search()

    const local = kind === 'component' ? this.components.get(name) : undefined
    if (local && local.path !== cleanId(importer)) {
      return transformComponentInfo(
        { from: toImportPath(local.path, importer) },
        this.options.importPathTransform,
      )
    }

    for (const resolver of this.options.resolvers) {
      if (resolver.type !== kind) continue
      const result = await resolver.resolve(name, importer)
      if (result) {
        const component = transformComponentInfo(
          normalizeResolveResult(result),
          this.options.importPathTransform,
        )
        this.addResolved(name, kind, component)
        return component
      }
    }
  }

  async transform(code: string, id: string): Promise<TransformResult> {
    if (!this.shouldTransform(id) || code.includes(DISABLE_COMMENT)) return null
    if (!/<[A-Z]|use:/.test(code)) return null

    await this.search()

    const filename = cleanId(id)
    const ast = parse(code, { filename, modern: true })
    const componentNames = findUsedComponents(ast.fragment)
    const actionNames = this.options.actions
      ? findUsedActions(ast.fragment)
      : new Set<string>()
    if (!componentNames.size && !actionNames.size) return null

    const declared = new Set<string>()
    collectBindings(declared, ast.module?.content)
    collectBindings(declared, ast.instance?.content)

    const imports: string[] = []
    for (const name of componentNames) {
      if (declared.has(name)) continue

      const component = await this.findComponent(name, filename)
      if (!component) continue

      imports.push(stringifyImport(name, component))
      declared.add(name)
    }
    for (const name of actionNames) {
      if (declared.has(name)) continue

      const action = await this.findAction(name, filename)
      if (!action) continue

      imports.push(stringifyImport(name, action))
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
    this.scheduleGeneratedFiles()
    return true
  }

  private addResolved(
    name: string,
    kind: ResolveKind,
    component: ComponentInfo,
  ) {
    const map =
      kind === 'component' ? this.resolvedComponents : this.resolvedActions
    const current = map.get(name)
    if (current?.from === component.from && current.name === component.name)
      return

    map.set(name, component)
    this.scheduleGeneratedFiles()
  }

  private getDeclarationComponents(): DeclarationComponent[] {
    return [
      ...Array.from(this.components.values(), toDeclarationComponent),
      ...Array.from(this.resolvedComponents, ([as, component]) => ({
        type: 'component' as const,
        as,
        ...component,
      })),
      ...Array.from(this.resolvedActions, ([as, component]) => ({
        type: 'action' as const,
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
    if (changed) this.scheduleGeneratedFiles()
  }

  private scheduleGeneratedFiles() {
    if (!this.options.dts && !this.options.dumpComponentsInfo) return
    clearTimeout(this.declarationTimer)
    this.declarationTimer = setTimeout(() => {
      void this.generateDeclaration()
      void this.generateComponentsInfo()
    }, 100)
  }
}
