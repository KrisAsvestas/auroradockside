'use strict'

const { mkdirSync, rmSync } = require('fs')
const { join, resolve } = require('path')
const archiveDirectory = require('./archive-directory.cjs')

const root = resolve(__dirname, '..')
const source = join(root, 'packages', 'aurora-dockside-connector')
const outputDir = join(root, 'dist', 'connectors')
const output = join(outputDir, 'aurora-dockside-connector-0.1.0.zip')
mkdirSync(outputDir, { recursive: true })
rmSync(output, { force: true })
archiveDirectory(source, output)
  .then(() => process.stdout.write(`${output}\n`))
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
