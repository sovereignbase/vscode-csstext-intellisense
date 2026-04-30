import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import textmate from 'vscode-textmate'
import oniguruma from 'vscode-oniguruma'

const { parseRawGrammar, Registry } = textmate
const { loadWASM, OnigScanner, OnigString } = oniguruma

const root = process.cwd()
const extensionRoot = join(
  root,
  '.vscode-test',
  'vscode-win32-x64-archive-1.90.0',
  'resources',
  'app',
  'extensions'
)
const grammars = new Map([
  [
    'source.ts',
    join(
      extensionRoot,
      'typescript-basics',
      'syntaxes',
      'TypeScript.tmLanguage.json'
    ),
  ],
  ['source.css', join(extensionRoot, 'css', 'syntaxes', 'css.tmLanguage.json')],
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
