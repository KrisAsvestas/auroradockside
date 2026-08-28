import { execFile, spawn } from 'child_process'
import { createRequire } from 'module'
import { mkdtemp, readFile, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join, resolve } from 'path'
import { promisify } from 'util'
import { describe, expect, it } from 'vitest'
import {
  renderMariaDbConfig,
  nativeConfigPath,
  renderNativeAdminerBootstrap,
  renderNginxConfig,
  renderPhpFpmConfig,
  startNativeProject,
  stopNativeProject
} from './nativeProject'
import { allocateNativePorts } from './portAllocator'

const projectRoot = join(tmpdir(), 'aurora demo')
const installedRuntimeRoot = join(tmpdir(), 'aurora-runtime')
const project = {
  name: 'demo',
  root: projectRoot,
  docroot: 'public',
  ports: { http: 41001, php: 41002, database: 41003, node: 41004 }
}
const execFileAsync = promisify(execFile)

function runtimeCommand(runtime: string, name: string): string {
  if (process.platform !== 'win32') return join(runtime, 'bin', name)
  if (name === 'php') return join(runtime, 'bin', 'php', 'php.exe')
  return join(runtime, 'bin', 'mariadb', 'bin', `${name}.exe`)
}

function runWithInput(command: string, args: string[], cwd: string, input: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env: process.env, stdio: ['pipe', 'pipe', 'pipe'] })
    let stderr = ''
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(stderr.trim() || `${command} exited with code ${code}`))
    })
    child.stdin.end(input)
  })
}

describe('native project configuration', () => {
  it('writes portable forward-slash paths into Windows service configuration', () => {
    expect(nativeConfigPath('C:\\Users\\Aurora Dragon\\project', 'win32')).toBe(
      'C:/Users/Aurora Dragon/project'
    )
  })
  it('isolates PHP-FPM on its allocated loopback port', () =>
    expect(renderPhpFpmConfig(project)).toContain('listen = 127.0.0.1:41002'))
  it('routes nginx PHP requests to the project PHP-FPM service', () => {
    const config = renderNginxConfig(project)
    expect(config).toContain('listen 127.0.0.1:41001')
    expect(config).toContain('fastcgi_pass 127.0.0.1:41002')
    expect(config).toContain('location ~ \\.php$')
    expect(config).toContain(resolve(projectRoot, 'public').replace(/\\/g, '\\\\'))
  })
  it('isolates MariaDB data and networking', () => {
    const config = renderMariaDbConfig(project, installedRuntimeRoot)
    expect(config).toContain('bind-address=127.0.0.1')
    expect(config).toContain('port=41003')
    expect(config).toContain(join(projectRoot, '.aurora', 'native', 'data', 'mariadb'))
  })
  it('creates a loopback Adminer endpoint with project database credentials', () => {
    expect(renderNginxConfig(project)).toContain('location = /__aurora/adminer/')
    const bootstrap = renderNativeAdminerBootstrap({
      ...project,
      installedRuntimeRoot
    })
    expect(bootstrap).toContain("value = '127.0.0.1:41003'")
    expect(bootstrap).toContain("username.value = 'db'")
    const adminer =
      process.platform === 'win32'
        ? join(installedRuntimeRoot, 'tools', 'adminer.php')
        : join(installedRuntimeRoot, 'root', 'usr', 'share', 'aurora', 'adminer.php')
    expect(bootstrap).toContain(adminer.replace(/\\/g, '\\\\'))
  })
})

it.runIf(Boolean(process.env.AURORA_NATIVE_SMOKE_ROOT))(
  'serves PHP through the complete native stack',
  async () => {
    const root = await mkdtemp(join(tmpdir(), 'aurora-native-project-'))
    await writeFile(join(root, 'index.php'), '<?php echo "aurora-native-ok";')
    const definition = {
      name: `smoke-${Date.now()}`,
      root,
      docroot: '',
      ports: await allocateNativePorts(),
      installedRuntimeRoot: process.env.AURORA_NATIVE_SMOKE_ROOT
    }
    try {
      await startNativeProject(definition)
      const response = await fetch(`http://127.0.0.1:${definition.ports.http}`)
      expect(await response.text()).toBe('aurora-native-ok')
    } finally {
      await stopNativeProject(definition)
    }
  },
  45000
)

it.runIf(Boolean(process.env.AURORA_NATIVE_WORDPRESS_SMOKE_ROOT))(
  'provisions WordPress with the bundled native runtime',
  async () => {
    const runtime = process.env.AURORA_NATIVE_WORDPRESS_SMOKE_ROOT!
    const root = await mkdtemp(join(tmpdir(), 'aurora-native-wordpress-'))
    const definition = {
      name: `wordpress-${Date.now()}`,
      root,
      docroot: '',
      ports: await allocateNativePorts(),
      installedRuntimeRoot: runtime
    }
    const wordpress = createRequire(import.meta.url)(
      '../../../packages/aurora-module-wordpress/main/index.cjs'
    ) as { projectCreate: (context: Record<string, unknown>) => Promise<void> }
    try {
      await wordpress.projectCreate({
        moduleId: 'wordpress',
        directory: root,
        projectName: definition.name,
        settings: {
          title: 'Aurora native smoke',
          admin_user: 'aurora-admin',
          admin_password: 'aurora-native-test-password',
          admin_email: 'smoke@aurora.local',
          locale: 'en_US',
          multisite: 'none',
          wp_debug: false
        },
        environment: { runtimeEngine: 'native' },
        urls: {
          http: `http://127.0.0.1:${definition.ports.http}`,
          https: `http://127.0.0.1:${definition.ports.http}`
        },
        native: {
          php: runtimeCommand(runtime, 'php'),
          wp:
            process.platform === 'win32'
              ? runtimeCommand(runtime, 'php')
              : join(runtime, 'bin', 'wp'),
          wpPrefixArgs:
            process.platform === 'win32'
              ? ['-d', 'memory_limit=512M', join(runtime, 'tools', 'wp-cli.phar')]
              : [],
          databasePort: definition.ports.database,
          start: () => startNativeProject(definition)
        },
        run: async (_label: string, command: string, args: string[]) => {
          await execFileAsync(command, args, {
            cwd: root,
            env: process.env,
            maxBuffer: 32 * 1024 * 1024
          })
        },
        setProjectMetadata: async () => undefined,
        saveCredentials: async () => undefined
      })
      expect(await readFile(join(root, 'wp-config.php'), 'utf8')).toContain(
        `127.0.0.1:${definition.ports.database}`
      )
      const response = await fetch(`http://127.0.0.1:${definition.ports.http}`)
      expect(response.ok).toBe(true)
      expect(await response.text()).toContain('Aurora native smoke')

      const databaseArgs = [
        '--host=127.0.0.1',
        `--port=${definition.ports.database}`,
        '--user=db',
        '--password=db',
        'db'
      ]
      const dump = await execFileAsync(
        runtimeCommand(runtime, 'mariadb-dump'),
        [...databaseArgs.slice(0, -1), '--single-transaction', 'db'],
        { cwd: root, env: process.env, maxBuffer: 32 * 1024 * 1024 }
      )
      await execFileAsync(
        runtimeCommand(runtime, 'mariadb'),
        [
          ...databaseArgs,
          '-e',
          "UPDATE wp_options SET option_value='Changed' WHERE option_name='blogname'"
        ],
        { cwd: root, env: process.env }
      )
      await runWithInput(runtimeCommand(runtime, 'mariadb'), databaseArgs, root, dump.stdout)
      const restored = await execFileAsync(
        runtimeCommand(runtime, 'mariadb'),
        [
          ...databaseArgs,
          '--batch',
          '--skip-column-names',
          '-e',
          "SELECT option_value FROM wp_options WHERE option_name='blogname'"
        ],
        { cwd: root, env: process.env }
      )
      expect(restored.stdout.trim()).toBe('Aurora native smoke')

      const adminerResponse = await fetch(
        `http://127.0.0.1:${definition.ports.http}/__aurora/adminer/`
      )
      const adminerHtml = await adminerResponse.text()
      expect(adminerResponse.ok).toBe(true)
      expect(adminerHtml).toContain('Adminer')
      expect(adminerHtml).toContain("username.value = 'db'")
      expect(adminerHtml).toContain("value = '127.0.0.1:")
    } finally {
      await stopNativeProject(definition)
    }
  },
  120000
)
