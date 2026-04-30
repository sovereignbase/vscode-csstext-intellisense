const assert = require('node:assert/strict')
const { mkdir, writeFile } = require('node:fs/promises')
const { join } = require('node:path')
const { tmpdir } = require('node:os')
const vscode = require('vscode')

async function run() {
  const workspace = join(tmpdir(), 'vscode-csstext-intellisense-test')
  const file = join(workspace, 'fixture.ts')

  await mkdir(workspace, { recursive: true })
  await writeFile(
    file,
    [
      'const element = document.createElement("div")',
      'element.style.cssText = `',
      '  ',
      '`',
      '',
    ].join('\n')
  )

  const document = await vscode.workspace.openTextDocument(
    vscode.Uri.file(file)
  )
  await vscode.languages.setTextDocumentLanguage(document, 'typescript')
  await vscode.window.showTextDocument(document)

  const propertyCompletions = await vscode.commands.executeCommand(
    'vscode.executeCompletionItemProvider',
    document.uri,
    new vscode.Position(2, 2)
  )

  assert.ok(propertyCompletions, 'expected property completion list')
  assert.ok(
    propertyCompletions.items.some((item) => item.label === 'display'),
    'expected display property completion inside style.cssText template'
  )

  const valueEdit = new vscode.WorkspaceEdit()
  valueEdit.insert(document.uri, new vscode.Position(2, 2), 'display: ')
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

module.exports = { run }
