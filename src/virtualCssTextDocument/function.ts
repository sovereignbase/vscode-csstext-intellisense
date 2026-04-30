import * as vscode from 'vscode'
import { TextDocument } from 'vscode-css-languageservice'
import type { CssTextTemplateRegion } from '../.types/CssTextTemplateRegion/type'
import type { VirtualCssTextDocument } from '../.types/VirtualCssTextDocument/type'

const wrapperPrefix = '.csstext {\n'
const wrapperSuffix = '\n}'

export function createVirtualCssTextDocument(
  document: vscode.TextDocument,
  region: CssTextTemplateRegion
): VirtualCssTextDocument {
  const sourceRange = new vscode.Range(region.start, region.end)
  const sourceText = document.getText(sourceRange)
  const sourceStartOffset = document.offsetAt(region.start)
  const virtualText = `${wrapperPrefix}${sourceText}${wrapperSuffix}`
  const virtualDocument = TextDocument.create(
    `${document.uri.toString()}.csstext.css`,
    'css',
    document.version,
    virtualText
  )

  return {
    document: virtualDocument,
    sourceText,
    sourceRange,
    toVirtualPosition(position) {
      const sourceOffset = document.offsetAt(position) - sourceStartOffset
      return virtualDocument.positionAt(wrapperPrefix.length + sourceOffset)
    },
    toSourceRange(range) {
      const start = toSourcePosition(
        document,
        virtualDocument,
        sourceStartOffset,
        sourceText.length,
        range.start
      )
      const end = toSourcePosition(
        document,
        virtualDocument,
        sourceStartOffset,
        sourceText.length,
        range.end
      )

      if (!start || !end) return undefined

      return new vscode.Range(start, end)
    },
  }
}

function toSourcePosition(
  sourceDocument: vscode.TextDocument,
  virtualDocument: TextDocument,
  sourceStartOffset: number,
  sourceLength: number,
  virtualPosition: { line: number; character: number }
): vscode.Position | undefined {
  const sourceOffset =
    virtualDocument.offsetAt(virtualPosition) - wrapperPrefix.length

  if (sourceOffset < 0 || sourceOffset > sourceLength) return undefined

  return sourceDocument.positionAt(sourceStartOffset + sourceOffset)
}
