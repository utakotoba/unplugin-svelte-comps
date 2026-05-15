import { dirname } from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'

import type { DeclarationComponent } from './types'

export interface ComponentsInfo {
  as: string
  from: string
  name: string
  type: DeclarationComponent['type']
}

export async function writeComponentsInfo(
  filepath: string | false,
  components: DeclarationComponent[],
) {
  if (!filepath) return

  const code = `${JSON.stringify(components.map(toInfo).toSorted(sortInfo), null, 2)}\n`

  await mkdir(dirname(filepath), { recursive: true })
  await writeFile(filepath, code, 'utf-8')
}

function sortInfo(a: ComponentsInfo, b: ComponentsInfo) {
  return `${a.type}:${a.as}`.localeCompare(`${b.type}:${b.as}`)
}

function toInfo(component: DeclarationComponent): ComponentsInfo {
  return {
    as: component.as,
    from: component.from,
    name: component.name || 'default',
    type: component.type,
  }
}
