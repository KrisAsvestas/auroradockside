'use strict'
/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/explicit-function-return-type */

const { createHash } = require('crypto')
const { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } = require('fs')
const { dirname, isAbsolute, join, resolve, sep } = require('path')
const { spawnSync } = require('child_process')

function fail(message) {
  throw new Error(message)
}
const [, , sourceArg, outputArg] = process.argv
if (!sourceArg || !outputArg)
  fail('Usage: node scripts/package-native-runtime.cjs <staging-directory> <output.tar.gz>')
const source = resolve(sourceArg)
const output = resolve(outputArg)
const templatePath = join(source, 'runtime.template.json')
if (!existsSync(templatePath)) fail(`Missing ${templatePath}`)
const template = JSON.parse(readFileSync(templatePath, 'utf8'))
if (
  template.schema !== 1 ||
  !Array.isArray(template.components) ||
  template.components.length === 0
)
  fail('Invalid runtime template')
const components = template.components.map((component) => {
  if (
    !component.executable ||
    isAbsolute(component.executable) ||
    component.executable.split(/[\\/]/).includes('..')
  )
    fail(`Unsafe executable for ${component.id}`)
  const executable = resolve(source, component.executable)
  if (executable !== source && !executable.startsWith(`${source}${sep}`))
    fail(`Executable leaves staging directory for ${component.id}`)
  if (!existsSync(executable))
    fail(`Missing executable for ${component.id}: ${component.executable}`)
  const sha256 = createHash('sha256').update(readFileSync(executable)).digest('hex')
  return {
    id: component.id,
    version: component.version,
    executable: component.executable.replaceAll('\\', '/'),
    sha256
  }
})
const manifest = {
  schema: 1,
  runtimeVersion: template.runtimeVersion,
  platform: template.platform,
  arch: template.arch,
  components
}
writeFileSync(join(source, 'runtime.json'), JSON.stringify(manifest, null, 2) + '\n')
mkdirSync(dirname(output), { recursive: true })
rmSync(output, { force: true })
const archive = spawnSync(
  'tar',
  ['-czf', output, '--exclude=runtime.template.json', '-C', source, '.'],
  { stdio: 'inherit' }
)
if (archive.error) throw archive.error
if (archive.status !== 0) fail(`tar failed with exit code ${archive.status}`)
process.stdout.write(`${output}\n`)
