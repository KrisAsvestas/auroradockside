'use strict'

function safeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'project'
}

function wpArgs(context, network) {
  const uid = typeof process.getuid === 'function' ? process.getuid() : undefined
  const gid = typeof process.getgid === 'function' ? process.getgid() : undefined
  return ['run', '--rm', ...(uid === undefined ? [] : ['--user', `${uid}:${gid}`]), '-e', 'HOME=/tmp', '-e', 'WP_CLI_CACHE_DIR=/tmp/wp-cli-cache', ...(network ? ['--network', `aurora-${safeName(context.projectName)}_default`] : []), '-v', `${context.directory}:/app`, '-w', '/app', '--entrypoint', 'php', 'wordpress:cli', '-d', 'memory_limit=512M', '/usr/local/bin/wp']
}

exports.projectCreate = async function projectCreate(context) {
  const s = context.settings
  const base = wpArgs(context, false)
  const networkBase = wpArgs(context, true)
  const siteUrl = context.urls.https
  await context.ensureRouter()
  await context.run('start', 'docker', ['compose', '-f', `${context.directory}/.aurora/compose.yaml`, 'up', '-d', '--build', '--remove-orphans'])
  await context.run('download', 'docker', [...base, 'core', 'download', `--locale=${s.locale || 'en_US'}`, '--force'])
  await context.run('config', 'docker', [...networkBase, 'config', 'create', '--dbname=db', '--dbuser=db', '--dbpass=db', '--dbhost=db:3306', '--skip-check', '--force'])
  await context.run('install', 'docker', [...networkBase, 'core', 'install', `--url=${siteUrl}`, `--title=${s.title}`, `--admin_user=${s.admin_user}`, `--admin_password=${s.admin_password}`, `--admin_email=${s.admin_email}`, '--skip-email'])
  await context.run('verify-install', 'docker', [...networkBase, 'core', 'is-installed'])
  if (s.multisite !== 'none') {
    await context.run('multisite-convert', 'docker', [...networkBase, 'core', 'multisite-convert', `--title=${s.title}`, ...(s.multisite === 'subdomain' ? ['--subdomains'] : [])])
    await context.run('verify-network', 'docker', [...networkBase, 'core', 'is-installed', '--network'])
    await context.run('verify-network-db', 'docker', [...networkBase, 'db', 'query', "SHOW TABLES LIKE 'wp_blogs';", '--skip-column-names'])
  }
  await context.setProjectMetadata({ multisite: String(s.multisite), routingWildcard: s.multisite === 'subdomain' })
  await context.run('permalinks', 'docker', [...networkBase, 'rewrite', 'structure', '/%postname%/', '--hard'])
  await context.run('debug', 'docker', [...networkBase, 'config', 'set', 'WP_DEBUG', String(Boolean(s.wp_debug)), '--raw'])
  await context.run('environment', 'docker', [...networkBase, 'config', 'set', 'WP_ENVIRONMENT_TYPE', 'local'])
  await context.saveCredentials({ platform: context.moduleId, adminUrl: `${siteUrl}/wp-admin/`, username: String(s.admin_user), password: String(s.admin_password), email: String(s.admin_email) })
}
