import * as vscode from 'vscode'
import type { LanguageService, TextEdit } from 'vscode-css-languageservice'
import { getCssTextTemplateRegions } from '../cssTextRegions/function'
import { createVirtualCssTextDocument } from '../virtualCssTextDocument/function'

export function provideCssTextFormattingEdits(
  cssLanguageService: LanguageService,
  document: vscode.TextDocument,
  range: vscode.Range | undefined,
  options: vscode.FormattingOptions
): vscode.TextEdit[] | undefined {
  const edits = getCssTextTemplateRegions(document, range)
    .map((region) => {
      const virtual = createVirtualCssTextDocument(document, region)

      if (virtual.sourceText.trim().length === 0) return undefined

      const cssEdits = cssLanguageService.format(virtual.document, undefined, {
        insertFinalNewline: false,
        insertSpaces: options.insertSpaces,
        maxPreserveNewLines: 1,
        newlineBetweenRules: false,
        preserveNewLines: false,
        tabSize: options.tabSize,
      })
      const formattedText = applyTextEdits(
        virtual.document.getText(),
        virtual.document,
        cssEdits
      )
      const formattedBody = getRuleBody(formattedText)

      if (formattedBody === undefined || formattedBody === virtual.sourceText) {
        return undefined
      }

      return new vscode.TextEdit(virtual.sourceRange, formattedBody)
    })
    .filter((edit) => edit !== undefined)

  return edits.length === 0 ? undefined : edits
}

function applyTextEdits(
  text: string,
  document: { offsetAt(position: { line: number; character: number }): number },
  edits: TextEdit[]
): string {
  return [...edits]
    .sort(
      (a, b) =>
        document.offsetAt(b.range.start) - document.offsetAt(a.range.start)
    )
    .reduce((result, edit) => {
      const start = document.offsetAt(edit.range.start)
      const end = document.offsetAt(edit.range.end)

      return `${result.slice(0, start)}${edit.newText}${result.slice(end)}`
    }, text)
}

function getRuleBody(text: string): string | undefined {
  const openBrace = text.indexOf('{')
  const closeBrace = text.lastIndexOf('}')

  if (openBrace === -1 || closeBrace === -1 || closeBrace < openBrace) {
    return undefined
  }

  return text.slice(openBrace + 1, closeBrace)
}
