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
const windows = template.platform === 'win32'
const php = windows ? join(root, 'bin/php/php.exe') : join(root, 'bin/php')
const checks = [
  ['PHP', php, ['--version'], template.components.find((item) => item.id === 'php')?.version],
  [
    'nginx',
    windows ? join(root, 'bin/nginx/nginx.exe') : join(root, 'bin/nginx'),
    ['-v'],
    template.components.find((item) => item.id === 'nginx')?.version
  ],
  [
    'MariaDB',
    windows ? join(root, 'bin/mariadb/bin/mariadbd.exe') : join(root, 'bin/mariadbd'),
    ['--version'],
    template.components.find((item) => item.id === 'mariadb')?.version
  ],
  [
    'WP-CLI',
    windows ? php : join(root, 'bin/wp'),
    windows ? [join(root, 'tools/wp-cli.phar'), '--version'] : ['--version'],
    template.components.find((item) => item.id === 'wp-cli')?.version
  ],
  [
    'MariaDB client',
    windows ? join(root, 'bin/mariadb/bin/mariadb.exe') : join(root, 'bin/mariadb'),
    ['--version'],
    template.components.find((item) => item.id === 'mariadb')?.version
  ],
  [
    'MariaDB dump',
    windows ? join(root, 'bin/mariadb/bin/mariadb-dump.exe') : join(root, 'bin/mariadb-dump'),
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

const extensions = spawnSync(
  php,
  ['-r', "exit(extension_loaded('mysqli') && extension_loaded('pdo_mysql') ? 0 : 1);"],
  { encoding: 'utf8' }
)
if (extensions.error || extensions.status !== 0)
  throw extensions.error || new Error(`PHP database extensions failed: ${extensions.stderr}`)
process.stdout.write('PHP mysqli and pdo_mysql extensions OK\n')

const adminer = spawnSync(
  php,
  [
    '-l',
    windows ? join(root, 'tools/adminer.php') : join(root, 'root/usr/share/aurora/adminer.php')
  ],
  { encoding: 'utf8' }
)
if (adminer.error || adminer.status !== 0)
  throw adminer.error || new Error(`Adminer PHP syntax check failed: ${adminer.stderr}`)
process.stdout.write('Adminer 6.0.1 PHP syntax OK\n')

const databaseDirectory = mkdtempSync(join(tmpdir(), 'aurora-native-mariadb-'))
const temporaryDirectory = mkdtempSync(join(tmpdir(), 'aurora-native-mariadb-tmp-'))
try {
  const result = spawnSync(
    windows
      ? join(root, 'bin/mariadb/bin/mariadb-install-db.exe')
      : join(root, 'bin/mariadb-install-db'),
    windows
      ? [`--datadir=${databaseDirectory}`, '--password=']
      : [
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
