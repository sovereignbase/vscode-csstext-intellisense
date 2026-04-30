import * as vscode from 'vscode'
import { InsertTextFormat } from 'vscode-css-languageservice'
import type {
  CompletionItem as CssCompletionItem,
  LanguageService,
  Range as CssRange,
} from 'vscode-css-languageservice'
import { getCssTextTemplateRegion } from '../cssTextRegion/function'
import { createVirtualCssTextDocument } from '../virtualCssTextDocument/function'

export function provideCssTextCompletionItems(
  cssLanguageService: LanguageService,
  document: vscode.TextDocument,
  position: vscode.Position,
  context: vscode.CompletionContext
): vscode.CompletionList | undefined {
  const region = getCssTextTemplateRegion(document, position)

  if (
    !region ||
    !shouldOfferCompletions(document, region.start, position, context)
  ) {
    return undefined
  }

  const virtual = createVirtualCssTextDocument(document, region)
  const stylesheet = cssLanguageService.parseStylesheet(virtual.document)
  const completions = cssLanguageService.doComplete(
    virtual.document,
    virtual.toVirtualPosition(position),
    stylesheet,
    {
      completePropertyWithSemicolon: true,
      triggerPropertyValueCompletion: true,
    }
  )
  const items = completions.items
    .map((item) => {
      const range = getTextEditRange(item)

      return toCompletionItem(item, range && virtual.toSourceRange(range))
    })
    .filter((item) => item !== undefined)

  if (items.length === 0) return undefined

  return new vscode.CompletionList(items, completions.isIncomplete)
}

function shouldOfferCompletions(
  document: vscode.TextDocument,
  regionStart: vscode.Position,
  position: vscode.Position,
  context: vscode.CompletionContext
): boolean {
  const textBeforeCursor = document.getText(
    new vscode.Range(regionStart, position)
  )
  const linePrefix = textBeforeCursor.split(/\r?\n/).at(-1) ?? ''

  if (context.triggerKind === vscode.CompletionTriggerKind.TriggerCharacter) {
    return context.triggerCharacter === ':' || context.triggerCharacter === '-'
  }

  if (linePrefix.trim().length === 0) return false

  return /[:_a-zA-Z-]\s*$/.test(linePrefix)
}

function toCompletionItem(
  cssItem: CssCompletionItem,
  range: vscode.Range | undefined
): vscode.CompletionItem | undefined {
  if (!range) return undefined

  const item = new vscode.CompletionItem(
    cssItem.label,
    toCompletionItemKind(cssItem.kind)
  )
  const insertText =
    cssItem.textEdit?.newText ?? cssItem.insertText ?? cssItem.label

  item.range = range
  item.insertText =
    cssItem.insertTextFormat === InsertTextFormat.Snippet
      ? new vscode.SnippetString(insertText)
      : insertText
  item.detail = cssItem.detail
  item.documentation = toDocumentation(cssItem.documentation)
  item.filterText = cssItem.filterText
  item.sortText = cssItem.sortText
  item.tags = cssItem.tags?.map((tag) => tag as vscode.CompletionItemTag)

  return item
}

function getTextEditRange(item: CssCompletionItem): CssRange | undefined {
  const textEdit = item.textEdit

  if (!textEdit) return undefined
  if ('range' in textEdit) return textEdit.range

  return textEdit.replace
}

function toCompletionItemKind(
  kind: CssCompletionItem['kind']
): vscode.CompletionItemKind | undefined {
  if (kind === undefined) return undefined

  return (kind - 1) as vscode.CompletionItemKind
}

function toDocumentation(
  documentation: CssCompletionItem['documentation']
): vscode.MarkdownString | string | undefined {
  if (!documentation) return undefined
  if (typeof documentation === 'string') return documentation

  return new vscode.MarkdownString(documentation.value)
}
