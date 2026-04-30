import * as vscode from 'vscode'

const languages = [
  'javascript',
  'javascriptreact',
  'typescript',
  'typescriptreact',
]

const propertySnippets: Record<string, string> = {
  display: 'display: ${1:flex};',
  position: 'position: ${1:absolute};',
  inset: 'inset: ${1:0};',
  top: 'top: ${1:0};',
  right: 'right: ${1:0};',
  bottom: 'bottom: ${1:0};',
  left: 'left: ${1:0};',
  width: 'width: ${1:100%};',
  height: 'height: ${1:100%};',
  margin: 'margin: ${1:0};',
  padding: 'padding: ${1:0};',
  color: 'color: ${1:inherit};',
  background: 'background: ${1:transparent};',
  border: 'border: ${1:0};',
  'border-radius': 'border-radius: ${1:0};',
  'box-shadow': 'box-shadow: ${1:none};',
  opacity: 'opacity: ${1:1};',
  transform: 'transform: ${1:translate(0, 0)};',
  transition: 'transition: ${1:all 150ms ease};',
  cursor: 'cursor: ${1:pointer};',
  'pointer-events': 'pointer-events: ${1:auto};',
  'user-select': 'user-select: ${1:none};',
  'z-index': 'z-index: ${1:1};',
  overflow: 'overflow: ${1:hidden};',
  'font-size': 'font-size: ${1:16px};',
  'font-family': 'font-family: ${1:inherit};',
  'line-height': 'line-height: ${1:1.5};',
  'white-space': 'white-space: ${1:pre-wrap};',
}

const valueSuggestions: Record<string, string[]> = {
  display: [
    'block',
    'inline',
    'inline-block',
    'flex',
    'inline-flex',
    'grid',
    'none',
  ],
  position: ['static', 'relative', 'absolute', 'fixed', 'sticky'],
  cursor: [
    'auto',
    'default',
    'pointer',
    'grab',
    'grabbing',
    'text',
    'not-allowed',
  ],
  overflow: ['visible', 'hidden', 'clip', 'scroll', 'auto'],
  'pointer-events': ['auto', 'none'],
  'user-select': ['auto', 'none', 'text', 'all'],
  'white-space': [
    'normal',
    'nowrap',
    'pre',
    'pre-wrap',
    'pre-line',
    'break-spaces',
  ],
  color: ['inherit', 'currentColor', 'transparent', 'black', 'white'],
  background: ['transparent', 'none', 'black', 'white'],
  opacity: ['0', '0.25', '0.5', '0.75', '1'],
}

export function activate(context: vscode.ExtensionContext): void {
  const selector: vscode.DocumentSelector = languages.map((language) => ({
    language,
    scheme: 'file',
  }))

  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      selector,
      {
        provideCompletionItems(document, position) {
          const region = getCssTextTemplateRegion(document, position)
          if (!region) return undefined

          const textBeforeCursor = document.getText(
            new vscode.Range(region.start, position)
          )
          const currentProperty = getCurrentProperty(textBeforeCursor)
          const replaceRange = document.getWordRangeAtPosition(
            position,
            /[-a-zA-Z]+/
          )

          if (currentProperty) {
            return valueSuggestions[currentProperty]?.map((value) => {
              const item = new vscode.CompletionItem(
                value,
                vscode.CompletionItemKind.Value
              )
              item.insertText = value
              item.range = replaceRange
              return item
            })
          }

          return Object.entries(propertySnippets).map(([property, snippet]) => {
            const item = new vscode.CompletionItem(
              property,
              vscode.CompletionItemKind.Property
            )
            item.insertText = new vscode.SnippetString(snippet)
            item.detail = '.style.cssText'
            item.range = replaceRange
            return item
          })
        },
      },
      '-',
      ':',
      ';',
      '\n',
      ' '
    )
  )
}

export function deactivate(): void {}

function getCssTextTemplateRegion(
  document: vscode.TextDocument,
  position: vscode.Position
): { start: vscode.Position; end: vscode.Position } | undefined {
  const fullText = document.getText()
  const offset = document.offsetAt(position)

  const startTick = findOpeningCssTextBacktick(fullText, offset)
  if (startTick === -1) return undefined

  const endTick = findClosingBacktick(fullText, startTick + 1)
  if (endTick !== -1 && endTick < offset) return undefined

  return {
    start: document.positionAt(startTick + 1),
    end:
      endTick === -1
        ? document.positionAt(fullText.length)
        : document.positionAt(endTick),
  }
}

function findOpeningCssTextBacktick(text: string, offset: number): number {
  for (let index = offset - 1; index >= 0; index--) {
    if (text[index] !== '`' || isEscaped(text, index)) continue

    const prefix = text.slice(Math.max(0, index - 128), index)
    if (/\.style\.cssText\s*=\s*$/.test(prefix)) return index
  }

  return -1
}

function findClosingBacktick(text: string, offset: number): number {
  for (let index = offset; index < text.length; index++) {
    if (text[index] === '`' && !isEscaped(text, index)) return index
  }

  return -1
}

function isEscaped(text: string, index: number): boolean {
  let slashes = 0

  for (let cursor = index - 1; cursor >= 0 && text[cursor] === '\\'; cursor--) {
    slashes++
  }

  return slashes % 2 === 1
}

function getCurrentProperty(text: string): string | undefined {
  const line = text.split(/\r?\n/).at(-1) ?? ''
  const match = /(?:^|;)\s*([-\w]+)\s*:\s*[-\w]*$/.exec(line)

  return match?.[1]
}
