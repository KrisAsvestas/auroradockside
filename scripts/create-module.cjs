'use strict'
/* eslint-disable @typescript-eslint/no-require-imports */

const { cpSync, existsSync, readFileSync, writeFileSync } = require('fs')
const { join, resolve } = require('path')

const id = String(process.argv[2] || '').toLowerCase()
if (!/^[a-z][a-z0-9-]{1,63}$/.test(id)) {
  throw new Error('Usage: npm run module:new -- <module-id> [Display Name]')
}
const root = resolve(__dirname, '..')
const destination = join(root, 'packages', `aurora-module-${id}`)
if (existsSync(destination)) throw new Error(`Module already exists: ${destination}`)
cpSync(join(root, 'templates', 'aurora-module'), destination, { recursive: true })
const manifestPath = join(destination, 'manifest.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
manifest.id = id
manifest.name = process.argv[3] || id.split('-').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ')
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
process.stdout.write(`Created ${manifest.name} at ${destination}\n`)
