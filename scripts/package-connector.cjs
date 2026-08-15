'use strict'

const { mkdirSync, rmSync } = require('fs')
const { join, resolve } = require('path')
const { spawnSync } = require('child_process')

const root = resolve(__dirname, '..')
const source = join(root, 'packages', 'aurora-dockside-connector')
const outputDir = join(root, 'dist', 'connectors')
const output = join(outputDir, 'aurora-dockside-connector-0.1.0.zip')
mkdirSync(outputDir, { recursive: true })
rmSync(output, { force: true })
const result = spawnSync('zip', ['-qr', output, 'aurora-dockside-connector'], {
  cwd: join(root, 'packages'),
  stdio: 'inherit'
})
if (result.error) throw result.error
if (result.status !== 0) throw new Error(`zip failed with exit code ${result.status}`)
process.stdout.write(`${output}\n`)
