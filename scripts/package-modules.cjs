'use strict'

const { mkdirSync, readFileSync, readdirSync, rmSync } = require('fs')
const { join, resolve } = require('path')
const { spawnSync } = require('child_process')

function packageModules() {
  const projectRoot = resolve(__dirname, '..')
  const packagesRoot = join(projectRoot, 'packages')
  const catalogRoot = join(projectRoot, 'dist', 'module-catalog')
  mkdirSync(catalogRoot, { recursive: true })

  for (const entry of readdirSync(packagesRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const source = join(packagesRoot, entry.name)
    let manifest
    try {
      manifest = JSON.parse(readFileSync(join(source, 'manifest.json'), 'utf8'))
    } catch {
      continue
    }
    if (!manifest.id || !manifest.version) throw new Error(`Invalid module manifest in ${source}`)
    const output = join(catalogRoot, `${manifest.id}-${manifest.version}.pac`)
    rmSync(output, { force: true })
    const result = spawnSync('zip', ['-qr', output, '.'], { cwd: source, stdio: 'inherit' })
    if (result.error) throw result.error
    if (result.status !== 0) throw new Error(`zip failed for ${manifest.id} with exit code ${result.status}`)
    process.stdout.write(`  • packaged module  ${manifest.id}@${manifest.version} → ${output}\n`)
  }
}

module.exports = packageModules

if (require.main === module) packageModules()
