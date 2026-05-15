import type { AST } from 'svelte/compiler'
import type {
  Declaration,
  ExportNamedDeclaration,
  Identifier,
  ImportDeclaration,
  ModuleDeclaration,
  Pattern,
  Program,
  Statement,
} from 'estree'

import type { ScriptProgram } from './types'

export function collectBindings(names: Set<string>, program: ScriptProgram) {
  for (const statement of program?.body ?? [])
    collectStatement(names, statement)
}

export function findUsedComponents(fragment: AST.Fragment) {
  const names = new Set<string>()
  walkFragment(fragment, (node) => {
    if (node.type === 'Component' && isComponentIdentifier(node.name))
      names.add(node.name)
  })
  return names
}

export function findUsedActions(fragment: AST.Fragment) {
  const names = new Set<string>()
  walkFragment(fragment, (node) => {
    if (!('attributes' in node)) return
    for (const attribute of node.attributes) {
      if (attribute.type === 'UseDirective' && isIdentifier(attribute.name))
        names.add(attribute.name)
    }
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

function addIdentifier(
  names: Set<string>,
  node: Identifier | null | undefined,
) {
  if (node) names.add(node.name)
}

function collectDeclaration(names: Set<string>, declaration: Declaration) {
  if (declaration.type === 'VariableDeclaration') {
    for (const item of declaration.declarations) collectPattern(names, item.id)
  } else if (
    declaration.type === 'FunctionDeclaration' ||
    declaration.type === 'ClassDeclaration'
  ) {
    addIdentifier(names, declaration.id)
  }
}

function collectExportDeclaration(
  names: Set<string>,
  statement: ExportNamedDeclaration,
) {
  if (statement.declaration) collectDeclaration(names, statement.declaration)
}

function collectImport(names: Set<string>, statement: ImportDeclaration) {
  for (const specifier of statement.specifiers)
    addIdentifier(names, specifier.local)
}

function collectPattern(names: Set<string>, node: Pattern) {
  if (node.type === 'Identifier') addIdentifier(names, node)
  else if (node.type === 'RestElement') collectPattern(names, node.argument)
  else if (node.type === 'AssignmentPattern') collectPattern(names, node.left)
  else if (node.type === 'ArrayPattern') {
    for (const element of node.elements) {
      if (element) collectPattern(names, element)
    }
  } else if (node.type === 'ObjectPattern') {
    for (const property of node.properties) {
      if (property.type === 'RestElement')
        collectPattern(names, property.argument)
      else collectPattern(names, property.value)
    }
  }
}

function collectStatement(
  names: Set<string>,
  statement: Program['body'][number],
) {
  if (statement.type === 'ImportDeclaration') collectImport(names, statement)
  else if (isDeclaration(statement)) collectDeclaration(names, statement)
  else if (statement.type === 'ExportNamedDeclaration')
    collectExportDeclaration(names, statement)
}

function isComponentIdentifier(name: string) {
  return /^[A-Z_$][\w$]*$/.test(name)
}

function isIdentifier(name: string) {
  return /^[$A-Z_a-z][$\w]*$/.test(name)
}

function isDeclaration(
  statement: Statement | ModuleDeclaration,
): statement is Declaration {
  return (
    statement.type === 'VariableDeclaration' ||
    statement.type === 'FunctionDeclaration' ||
    statement.type === 'ClassDeclaration'
  )
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
