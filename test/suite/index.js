const assert = require('node:assert/strict')
const { mkdir, writeFile } = require('node:fs/promises')
const { join } = require('node:path')
const { tmpdir } = require('node:os')
const vscode = require('vscode')

async function run() {
  const workspace = join(tmpdir(), 'vscode-csstext-intellisense-test')

  await mkdir(workspace, { recursive: true })

  await testCompletions(workspace)
  await testFormatting(workspace)
}

async function testCompletions(workspace) {
  const document = await openTypescriptFixture(workspace, 'completion.ts', [
    'const element = document.createElement("div")',
    'element.style.cssText = `',
    '  ',
    '`',
    '',
  ])

  const blankCompletions = await vscode.commands.executeCommand(
    'vscode.executeCompletionItemProvider',
    document.uri,
    new vscode.Position(2, 2)
  )

  assert.ok(
    !blankCompletions?.items.some((item) => item.label === 'display'),
    'expected no cssText property completions before the user types'
  )

  const propertyEdit = new vscode.WorkspaceEdit()
  propertyEdit.insert(document.uri, new vscode.Position(2, 2), 'd')
  await vscode.workspace.applyEdit(propertyEdit)

  const propertyCompletions = await vscode.commands.executeCommand(
    'vscode.executeCompletionItemProvider',
    document.uri,
    new vscode.Position(2, 3)
  )

  assert.ok(propertyCompletions, 'expected property completion list')
  assert.ok(
    propertyCompletions.items.some((item) => item.label === 'display'),
    'expected display property completion after typing a prefix'
  )

  const valueEdit = new vscode.WorkspaceEdit()
  valueEdit.replace(
    document.uri,
    new vscode.Range(new vscode.Position(2, 2), new vscode.Position(2, 3)),
    'display: '
  )
  await vscode.workspace.applyEdit(valueEdit)

  const valueCompletions = await vscode.commands.executeCommand(
    'vscode.executeCompletionItemProvider',
    document.uri,
    new vscode.Position(2, 11)
  )

  assert.ok(valueCompletions, 'expected value completion list')
  assert.ok(
    valueCompletions.items.some((item) => item.label === 'flex'),
    'expected flex value completion after display property'
  )
}

async function testFormatting(workspace) {
  const document = await openTypescriptFixture(workspace, 'formatting.ts', [
    'const element = document.createElement("div")',
    'element.style.cssText = `color:inherit;background:transparent;`',
    '',
  ])
  const rangeEdits = await vscode.commands.executeCommand(
    'vscode.executeFormatRangeProvider',
    document.uri,
    new vscode.Range(new vscode.Position(1, 24), new vscode.Position(1, 61)),
    { insertSpaces: true, tabSize: 2 }
  )
  const rangeFormattedText = applyTextEdits(document, rangeEdits ?? [])

  assert.ok(
    rangeFormattedText.includes(
      '`\n  color: inherit;\n  background: transparent;\n`'
    ),
    'expected range formatting to format the cssText declaration list'
  )

  const documentEdits = await vscode.commands.executeCommand(
    'vscode.executeFormatDocumentProvider',
    document.uri,
    { insertSpaces: true, tabSize: 2 }
  )
  const documentFormattedText = applyTextEdits(document, documentEdits ?? [])

  assert.ok(
    documentFormattedText.includes('color: inherit;'),
    'expected document formatting to include cssText edits'
  )
}

async function openTypescriptFixture(workspace, filename, lines) {
  const file = join(workspace, filename)

  await writeFile(file, lines.join('\n'))

  const document = await vscode.workspace.openTextDocument(
    vscode.Uri.file(file)
  )
  await vscode.languages.setTextDocumentLanguage(document, 'typescript')
  await vscode.window.showTextDocument(document)

  return document
}

function applyTextEdits(document, edits) {
  return [...edits]
    .sort(
      (a, b) =>
        document.offsetAt(b.range.start) - document.offsetAt(a.range.start)
    )
    .reduce((text, edit) => {
      const start = document.offsetAt(edit.range.start)
      const end = document.offsetAt(edit.range.end)

      return `${text.slice(0, start)}${edit.newText}${text.slice(end)}`
    }, document.getText())
}

module.exports = { run }
