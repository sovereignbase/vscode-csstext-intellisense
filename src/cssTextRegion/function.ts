import * as vscode from 'vscode'
import type { CssTextTemplateRegion } from '../.types/CssTextTemplateRegion/type'
import { getCssTextTemplateRegions } from '../cssTextRegions/function'

export function getCssTextTemplateRegion(
  document: vscode.TextDocument,
  position: vscode.Position
): CssTextTemplateRegion | undefined {
  const point = document.offsetAt(position)

  return getCssTextTemplateRegions(document).find((region) => {
    const start = document.offsetAt(region.start)
    const end = document.offsetAt(region.end)

    return start <= point && point <= end
  })
}
