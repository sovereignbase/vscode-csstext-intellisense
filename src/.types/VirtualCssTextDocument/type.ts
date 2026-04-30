import type * as vscode from 'vscode'
import type { Position, Range, TextDocument } from 'vscode-css-languageservice'

export type VirtualCssTextDocument = {
  readonly document: TextDocument
  readonly sourceText: string
  readonly sourceRange: vscode.Range
  readonly toVirtualPosition: (position: vscode.Position) => Position
  readonly toSourceRange: (range: Range) => vscode.Range | undefined
}
