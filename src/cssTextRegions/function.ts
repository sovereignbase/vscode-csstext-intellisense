import * as vscode from 'vscode'
import type { CssTextTemplateRegion } from '../.types/CssTextTemplateRegion/type'

export function getCssTextTemplateRegions(
  document: vscode.TextDocument,
  range?: vscode.Range
): CssTextTemplateRegion[] {
  const text = document.getText()
  const startOffset = range ? document.offsetAt(range.start) : 0
  const endOffset = range ? document.offsetAt(range.end) : text.length
  const regions: CssTextTemplateRegion[] = []
  const cssTextAssignmentPattern = /\.style\.cssText\s*=\s*`/g

  for (
    let match = cssTextAssignmentPattern.exec(text);
    match;
    match = cssTextAssignmentPattern.exec(text)
  ) {
    const openingTickOffset = match.index + match[0].length - 1
    const contentStartOffset = openingTickOffset + 1
    const closingTickOffset = findClosingTemplateBacktick(
      text,
      contentStartOffset
    )
    const contentEndOffset =
      closingTickOffset === -1 ? text.length : closingTickOffset

    if (contentEndOffset >= startOffset && contentStartOffset <= endOffset) {
      regions.push({
        start: document.positionAt(contentStartOffset),
        end: document.positionAt(contentEndOffset),
      })
    }

    if (closingTickOffset !== -1) {
      cssTextAssignmentPattern.lastIndex = closingTickOffset + 1
    }
  }

  return regions
}

function findClosingTemplateBacktick(text: string, offset: number): number {
  for (let index = offset; index < text.length; index++) {
    const char = text[index]

    if (char === '\\') {
      index++
      continue
    }

    if (char === '`') return index

    if (char === '$' && text[index + 1] === '{') {
      index = skipTemplateExpression(text, index + 2)
    }
  }

  return -1
}

function skipTemplateExpression(text: string, offset: number): number {
  let depth = 1

  for (let index = offset; index < text.length; index++) {
    const char = text[index]
    const next = text[index + 1]

    if (char === "'" || char === '"') {
      index = skipQuotedString(text, index, char)
      continue
    }

    if (char === '`') {
      const nestedEnd = findClosingTemplateBacktick(text, index + 1)
      if (nestedEnd === -1) return text.length
      index = nestedEnd
      continue
    }

    if (char === '/' && next === '/') {
      index = skipLineComment(text, index + 2)
      continue
    }

    if (char === '/' && next === '*') {
      index = skipBlockComment(text, index + 2)
      continue
    }

    if (char === '{') depth++

    if (char === '}') {
      depth--
      if (depth === 0) return index
    }
  }

  return text.length
}

function skipQuotedString(text: string, offset: number, quote: string): number {
  for (let index = offset + 1; index < text.length; index++) {
    if (text[index] === '\\') {
      index++
      continue
    }

    if (text[index] === quote) return index
  }

  return text.length
}

function skipLineComment(text: string, offset: number): number {
  const lineEnd = text.indexOf('\n', offset)
  return lineEnd === -1 ? text.length : lineEnd
}

function skipBlockComment(text: string, offset: number): number {
  const commentEnd = text.indexOf('*/', offset)
  return commentEnd === -1 ? text.length : commentEnd + 1
}
