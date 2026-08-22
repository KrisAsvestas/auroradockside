'use strict'
/* eslint-disable @typescript-eslint/no-require-imports */

const { existsSync, mkdtempSync, readFileSync, rmSync } = require('fs')
const { tmpdir } = require('os')
const { join, resolve } = require('path')
const { spawnSync } = require('child_process')

const root = resolve(process.argv[2] || '')
if (!root || !existsSync(join(root, 'runtime.template.json')))
  throw new Error('Usage: node scripts/smoke-native-runtime.cjs <staging-directory>')
const template = JSON.parse(readFileSync(join(root, 'runtime.template.json'), 'utf8'))
const checks = [
  [
    'PHP',
    join(root, 'bin/php'),
    ['--version'],
    template.components.find((item) => item.id === 'php')?.version
  ],
  [
    'nginx',
    join(root, 'bin/nginx'),
    ['-v'],
    template.components.find((item) => item.id === 'nginx')?.version
  ],
  [
    'MariaDB',
    join(root, 'bin/mariadbd'),
    ['--version'],
    template.components.find((item) => item.id === 'mariadb')?.version
  ]
]
for (const [name, command, args, version] of checks) {
  const result = spawnSync(command, args, { encoding: 'utf8' })
  const output = `${result.stdout || ''}${result.stderr || ''}`
  if (result.error || result.status !== 0)
    throw result.error || new Error(`${name} smoke check failed: ${output}`)
  if (!version || !output.includes(version))
    throw new Error(`${name} did not report expected version ${version}: ${output}`)
  process.stdout.write(`${name} ${version} OK\n`)
}

const databaseDirectory = mkdtempSync(join(tmpdir(), 'aurora-native-mariadb-'))
const temporaryDirectory = mkdtempSync(join(tmpdir(), 'aurora-native-mariadb-tmp-'))
try {
  const result = spawnSync(
    join(root, 'bin/mariadb-install-db'),
    [
      '--no-defaults',
      `--datadir=${databaseDirectory}`,
      `--tmpdir=${temporaryDirectory}`,
      '--auth-root-authentication-method=normal',
      '--skip-test-db'
    ],
    { encoding: 'utf8' }
  )
  if (result.error || result.status !== 0)
    throw result.error || new Error(`MariaDB initialization failed: ${result.stderr}`)
  if (!existsSync(join(databaseDirectory, 'mysql')))
    throw new Error('MariaDB initialization did not create system tables.')
  process.stdout.write('MariaDB initialization OK\n')
} finally {
  rmSync(databaseDirectory, { recursive: true, force: true })
  rmSync(temporaryDirectory, { recursive: true, force: true })
}
