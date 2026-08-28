'use strict'

function safeName(name) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'project'
  )
}

function wpArgs(context, network) {
  const uid = typeof process.getuid === 'function' ? process.getuid() : undefined
  const gid = typeof process.getgid === 'function' ? process.getgid() : undefined
  return [
    'run',
    '--rm',
    ...(uid === undefined ? [] : ['--user', `${uid}:${gid}`]),
    '-e',
    'HOME=/tmp',
    '-e',
    'WP_CLI_CACHE_DIR=/tmp/wp-cli-cache',
    ...(network ? ['--network', `aurora-${safeName(context.projectName)}_default`] : []),
    '-v',
    `${context.directory}:/app`,
    '-w',
    '/app',
    '--entrypoint',
    'php',
    'wordpress:cli',
    '-d',
    'memory_limit=512M',
    '/usr/local/bin/wp'
  ]
}

exports.projectCreate = async function projectCreate(context) {
  const s = context.settings
  const title = String(s.title || '').trim() || context.projectName
  const native = context.environment.runtimeEngine === 'native'
  const nativePhpPrefix = native ? context.native.phpPrefixArgs || [] : []
  const nativePrefix = native ? context.native.wpPrefixArgs || [] : []
  const base = native ? [...nativePrefix, `--path=${context.directory}`] : wpArgs(context, false)
  const networkBase = native ? base : wpArgs(context, true)
  const command = native ? context.native.wp : 'docker'
  const siteUrl = native ? context.urls.http : context.urls.https
  const wp = (label, args) => context.run(label, command, [...networkBase, ...args])
  if (native) {
    await context.native.start()
    const port = Number(context.native.databasePort)
    const bootstrap = `$db=new mysqli('127.0.0.1','root','',null,${port});if($db->connect_error)throw new Exception($db->connect_error);$db->query('CREATE DATABASE IF NOT EXISTS db');$db->query("CREATE USER IF NOT EXISTS 'db'@'127.0.0.1' IDENTIFIED BY 'db'");$db->query("GRANT ALL ON db.* TO 'db'@'127.0.0.1'");`
    await context.run('database', context.native.php, [...nativePhpPrefix, '-r', bootstrap])
  } else {
    await context.ensureRouter()
    await context.run('start', 'docker', [
      'compose',
      '-f',
      `${context.directory}/.aurora/compose.yaml`,
      'up',
      '-d',
      '--build',
      '--remove-orphans'
    ])
  }
  await context.run('download', command, [
    ...base,
    'core',
    'download',
    `--locale=${s.locale || 'en_US'}`,
    '--force'
  ])
  await context.run('config', command, [
    ...networkBase,
    'config',
    'create',
    '--dbname=db',
    '--dbuser=db',
    '--dbpass=db',
    `--dbhost=${native ? `127.0.0.1:${context.native.databasePort}` : 'db:3306'}`,
    '--skip-check',
    '--force'
  ])
  await wp('install', [
    'core',
    'install',
    `--url=${siteUrl}`,
    `--title=${title}`,
    `--admin_user=${s.admin_user}`,
    `--admin_password=${s.admin_password}`,
    `--admin_email=${s.admin_email}`,
    '--skip-email'
  ])
  await wp('verify-install', ['core', 'is-installed'])
  if (s.multisite !== 'none') {
    await wp('multisite-convert', [
      'core',
      'multisite-convert',
      `--title=${title}`,
      ...(s.multisite === 'subdomain' ? ['--subdomains'] : [])
    ])
    await wp('verify-network', ['core', 'is-installed', '--network'])
    await wp('verify-network-db', [
      'db',
      'query',
      "SHOW TABLES LIKE 'wp_blogs';",
      '--skip-column-names'
    ])
  }
  await context.setProjectMetadata({
    multisite: String(s.multisite),
    routingWildcard: s.multisite === 'subdomain'
  })
  if (native) {
    await wp('permalinks', ['option', 'update', 'permalink_structure', '/%postname%/'])
  } else {
    await wp('permalinks', ['rewrite', 'structure', '/%postname%/', '--hard'])
  }
  await wp('debug', ['config', 'set', 'WP_DEBUG', String(Boolean(s.wp_debug)), '--raw'])
  await wp('environment', ['config', 'set', 'WP_ENVIRONMENT_TYPE', 'local'])
  await context.saveCredentials({
    platform: context.moduleId,
    adminUrl: `${siteUrl}/wp-admin/`,
    username: String(s.admin_user),
    password: String(s.admin_password),
    email: String(s.admin_email)
  })
}
