import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runTests } from '@vscode/test-electron'

const directory = dirname(fileURLToPath(import.meta.url))
const root = resolve(directory, '..')

delete process.env.ELECTRON_RUN_AS_NODE

await runTests({
  version: '1.90.0',
  extensionDevelopmentPath: root,
  extensionTestsPath: resolve(directory, 'suite', 'index.js'),
  launchArgs: ['--disable-extensions'],
})
