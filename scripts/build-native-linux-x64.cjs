'use strict'
/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/explicit-function-return-type */

const { chmodSync, existsSync, mkdirSync, rmSync } = require('fs')
const { join, resolve } = require('path')
const { spawnSync } = require('child_process')

const projectRoot = resolve(__dirname, '..')
const buildRoot = join(projectRoot, 'runtime-build', 'linux-x64')
const stagingRoot = join(projectRoot, 'dist', 'native-runtime', 'linux-x64-stage')
const archive = join(projectRoot, 'dist', 'native-runtime', 'aurora-native-0.1.0-linux-x64.tar.gz')

function run(command, args) {
  const result = spawnSync(command, args, { cwd: projectRoot, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${command} failed with exit code ${result.status}`)
}

if (process.platform !== 'linux' || process.arch !== 'x64')
  throw new Error('This builder targets Linux x64 only.')
mkdirSync(stagingRoot, { recursive: true })
rmSync(stagingRoot, { recursive: true, force: true })
mkdirSync(stagingRoot, { recursive: true })
run('docker', ['build', '--pull', '--output', `type=local,dest=${stagingRoot}`, buildRoot])
for (const executable of [
  'aurora-exec',
  'php',
  'php-fpm',
  'nginx',
  'mariadbd',
  'mariadb-install-db'
]) {
  const path = join(stagingRoot, 'bin', executable)
  if (!existsSync(path)) throw new Error(`Builder did not produce ${path}`)
  chmodSync(path, 0o755)
}
run('node', ['scripts/smoke-native-runtime.cjs', stagingRoot])
run('node', ['scripts/package-native-runtime.cjs', stagingRoot, archive])
