import * as vscode from 'vscode'
import { getCSSLanguageService } from 'vscode-css-languageservice'
import { provideCssTextCompletionItems } from './cssTextCompletions/function'
import { provideCssTextFormattingEdits } from './cssTextFormatting/function'

const languages = [
  'javascript',
  'javascriptreact',
  'typescript',
  'typescriptreact',
]

export function activate(context: vscode.ExtensionContext): void {
  const cssLanguageService = getCSSLanguageService()
  const selector: vscode.DocumentSelector = languages.map((language) => ({
    language,
    scheme: 'file',
  }))

  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      selector,
      {
        provideCompletionItems(document, position, _token, completionContext) {
          return provideCssTextCompletionItems(
            cssLanguageService,
            document,
            position,
            completionContext
          )
        },
      },
      '-',
      ':'
    ),
    vscode.languages.registerDocumentRangeFormattingEditProvider(selector, {
      provideDocumentRangeFormattingEdits(document, range, options) {
        return provideCssTextFormattingEdits(
          cssLanguageService,
          document,
          range,
          options
        )
      },
    }),
    vscode.languages.registerDocumentFormattingEditProvider(selector, {
      provideDocumentFormattingEdits(document, options) {
        return provideCssTextFormattingEdits(
          cssLanguageService,
          document,
          undefined,
          options
        )
      },
    })
  )
}
