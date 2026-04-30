import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { join, sep } from 'node:path'
import textmate from 'vscode-textmate'
import oniguruma from 'vscode-oniguruma'

const { parseRawGrammar, Registry } = textmate
const { loadWASM, OnigScanner, OnigString } = oniguruma

const root = process.cwd()
const vscodeTestRoot = join(root, '.vscode-test')
const typescriptGrammarPath = await findVscodeGrammar([
  'extensions',
  'typescript-basics',
  'syntaxes',
  'TypeScript.tmLanguage.json',
])
const cssGrammarPath = await findVscodeGrammar([
  'extensions',
  'css',
  'syntaxes',
  'css.tmLanguage.json',
])
const grammars = new Map([
  ['source.ts', typescriptGrammarPath],
  ['source.css', cssGrammarPath],
  [
    'inline.csstext.injection',
    join(root, 'syntaxes', 'csstext.injection.json'),
  ],
])

await loadWASM(
  await readFile(
    join(root, 'node_modules', 'vscode-oniguruma', 'release', 'onig.wasm')
  )
)

const registry = new Registry({
  onigLib: Promise.resolve({
    createOnigScanner(patterns) {
      return new OnigScanner(patterns)
    },
    createOnigString(text) {
      return new OnigString(text)
    },
  }),
  async loadGrammar(scopeName) {
    const filename = grammars.get(scopeName)

    if (!filename) return null

    return parseRawGrammar(await readFile(filename, 'utf8'), filename)
  },
  getInjections(scopeName) {
    return scopeName === 'source.ts' ? ['inline.csstext.injection'] : undefined
  },
})
const grammar = await registry.loadGrammarWithConfiguration('source.ts', 1, {
  embeddedLanguages: {
    'meta.embedded.block.css': 2,
  },
  tokenTypes: {
    'meta.embedded.block.css': 'other',
  },
})

assert.ok(grammar, 'expected TypeScript grammar to load')

const tokens = tokenize(grammar, [
  'const box = document.createElement("div")',
  'box.style.cssText = `',
  '  background-color: red;',
  '  color: ${active ? "#fff" : "#000"};',
  '`',
])
const inlineTokens = tokenize(grammar, [
  'box.style.cssText = `margin-left: 10px; color: red;`',
])
const invalidSelectorTokens = tokenize(grammar, [
  'box.style.cssText = `10l {margin: left;}`',
])

assertToken(
  tokens,
  'background-color',
  'support.type.property-name.css',
  'expected cssText property names to be tokenized as CSS declarations'
)
assertToken(
  tokens,
  'red',
  'support.constant.color.w3c-standard-color-name.css',
  'expected cssText values to be tokenized as CSS property values'
)
assertNoToken(
  tokens,
  'background-color',
  'meta.selector.css',
  'cssText declarations must not be tokenized as top-level CSS selectors'
)
assertToken(
  tokens,
  '${',
  'punctuation.section.embedded.begin.js',
  'expected template substitutions inside cssText values to remain JavaScript'
)
assertToken(
  inlineTokens,
  'margin-left',
  'support.type.property-name.css',
  'expected inline cssText declarations to be property/value CSS'
)
assertNoToken(
  invalidSelectorTokens,
  'margin',
  'support.type.property-name.css',
  'cssText must not treat selector blocks as valid nested declaration lists'
)

function tokenize(grammar, lines) {
  let ruleStack = null
  const result = []

  for (const line of lines) {
    const lineResult = grammar.tokenizeLine(line, ruleStack)

    for (const token of lineResult.tokens) {
      result.push({
        text: line.slice(token.startIndex, token.endIndex),
        scopes: token.scopes,
      })
    }

    ruleStack = lineResult.ruleStack
  }

  return result
}

function assertToken(tokens, text, scope, message) {
  assert.ok(
    tokens.some((token) => token.text === text && token.scopes.includes(scope)),
    `${message}\n${renderTokens(tokens)}`
  )
}

function assertNoToken(tokens, text, scope, message) {
  assert.ok(
    !tokens.some(
      (token) => token.text === text && token.scopes.includes(scope)
    ),
    `${message}\n${renderTokens(tokens)}`
  )
}

function renderTokens(tokens) {
  return tokens
    .map((token) => `${JSON.stringify(token.text)} ${token.scopes.join(' ')}`)
    .join('\n')
}

async function findVscodeGrammar(suffixSegments) {
  const suffix = suffixSegments.join('/')
  const matches = await findFilesBySuffix(vscodeTestRoot, suffix)
  const match = matches
    .sort((left, right) => rankGrammarPath(right) - rankGrammarPath(left))
    .at(0)

  if (!match) {
    throw new Error(
      `Could not find VS Code grammar under .vscode-test: ${suffix}`
    )
  }

  return match
}

async function findFilesBySuffix(directory, suffix) {
  const entries = await readdir(directory, { withFileTypes: true })
  const matches = []

  for (const entry of entries) {
    const path = join(directory, entry.name)

    if (entry.isDirectory()) {
      matches.push(...(await findFilesBySuffix(path, suffix)))
      continue
    }

    if (normalizePath(path).endsWith(suffix)) {
      matches.push(path)
    }
  }

  return matches
}

function normalizePath(path) {
  return path.split(sep).join('/')
}

function rankGrammarPath(path) {
  return normalizePath(path).includes('1.90.0') ? 1 : 0
}
