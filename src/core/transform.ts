import type { AST } from 'svelte/compiler'

import type { Program } from './types'

export function collectBindings(names: Set<string>, program: Program) {
  for (const statement of program?.body ?? []) {
    if (statement.type === 'ImportDeclaration') {
      for (const specifier of statement.specifiers ?? [])
        addIdentifier(names, specifier.local)
    } else if (statement.type === 'VariableDeclaration') {
      for (const declaration of statement.declarations ?? [])
        collectPattern(names, declaration.id)
    } else if (
      statement.type === 'FunctionDeclaration' ||
      statement.type === 'ClassDeclaration'
    ) {
      addIdentifier(names, statement.id)
    } else if (statement.type === 'ExportNamedDeclaration') {
      collectExportDeclaration(names, statement.declaration)
    }
  }
}

export function findUsedComponents(fragment: AST.Fragment) {
  const names = new Set<string>()
  walkFragment(fragment, (node) => {
    if (node.type === 'Component' && isComponentIdentifier(node.name))
      names.add(node.name)
  })
  return names
}

export function getScriptInsert(code: string, script: AST.Script) {
  const openEnd = code.indexOf('>', script.start) + 1
  const pos = openEnd || script.start

  if (code[pos] === '\r' && code[pos + 1] === '\n')
    return { pos: pos + 2, content: '' }
  if (code[pos] === '\n') return { pos: pos + 1, content: '' }
  return { pos, content: '\n' }
}

function addIdentifier(names: Set<string>, node: any) {
  if (node?.type === 'Identifier') names.add(node.name)
}

function collectExportDeclaration(names: Set<string>, declaration: any) {
  if (!declaration) return
  collectBindings(names, { body: [declaration] })
}

function collectPattern(names: Set<string>, node: any) {
  if (!node) return

  if (node.type === 'Identifier') addIdentifier(names, node)
  else if (node.type === 'RestElement') collectPattern(names, node.argument)
  else if (node.type === 'AssignmentPattern') collectPattern(names, node.left)
  else if (node.type === 'ArrayPattern') {
    for (const element of node.elements ?? []) collectPattern(names, element)
  } else if (node.type === 'ObjectPattern') {
    for (const property of node.properties ?? [])
      collectPattern(names, property.value ?? property.argument)
  }
}

function isComponentIdentifier(name: string) {
  return /^[A-Z_$][\w$]*$/.test(name)
}

function walkFragment(
  fragment: AST.Fragment | undefined,
  visit: (node: AST.Fragment['nodes'][number] | AST.Component) => void,
) {
  if (!fragment) return

  for (const node of fragment.nodes) {
    visit(node)

    if ('fragment' in node) walkFragment(node.fragment, visit)
    if ('branches' in node && Array.isArray(node.branches)) {
      for (const branch of node.branches) walkFragment(branch.fragment, visit)
    }
  }
}
