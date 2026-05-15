import { relative } from 'node:path'

export function cleanId(id: string) {
  return slash(id.replace(/[?#].*$/, ''))
}

export function isInside(path: string, dir: string) {
  const rel = slash(relative(dir, path))
  return rel === '' || (!rel.startsWith('../') && rel !== '..')
}

export function matches(patterns: Array<string | RegExp>, id: string): boolean {
  return patterns.some((pattern) => {
    if (typeof pattern === 'string') return id.includes(pattern)
    pattern.lastIndex = 0
    return pattern.test(id)
  })
}

export function pascalCase(value: string) {
  return value
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)
    .join('')
}

export function slash(path: string) {
  return path.replace(/\\/g, '/')
}

export function toArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value]
}
