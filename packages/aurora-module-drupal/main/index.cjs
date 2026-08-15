'use strict'

function containerUser() {
  if (typeof process.getuid !== 'function') return []
  return ['--user', `${process.getuid()}:${process.getgid()}`]
}

function compose(context, ...args) {
  return ['compose', '-f', `${context.directory}/.aurora/compose.yaml`, ...args]
}

function phpExec(context, ...args) {
  return compose(context, 'exec', '-T', ...containerUser(), '-e', 'HOME=/tmp', '-e', 'COMPOSER_HOME=/tmp/composer', 'php', ...args)
}

function databaseUrl(context) {
  const driver = context.environment.database === 'postgres' ? 'pgsql' : 'mysql'
  return `${driver}://db:db@db:3306/db`.replace(':3306/', context.environment.database === 'postgres' ? ':5432/' : ':3306/')
}

exports.projectCreate = async function projectCreate(context) {
  const settings = context.settings
  const siteName = String(settings.site_name || '').trim() || context.projectName
  const temporaryProject = '/tmp/aurora-drupal-project'
  await context.ensureRouter()
  await context.run('Start project services', 'docker', compose(context, 'up', '-d', '--build', '--remove-orphans'))
  await context.run('Download Drupal 11', 'docker', phpExec(context, 'sh', '-lc', `rm -rf ${temporaryProject} && composer create-project drupal/recommended-project:^11 ${temporaryProject} --no-interaction --no-progress && cp -a ${temporaryProject}/. /var/www/html/ && rm -rf ${temporaryProject}`))
  await context.run('Install Drush', 'docker', phpExec(context, 'composer', 'require', 'drush/drush:^13', '--no-interaction', '--no-progress'))
  await context.run('Install Drupal', 'docker', phpExec(context, 'vendor/bin/drush', 'site:install', String(settings.profile || 'standard'), `--db-url=${databaseUrl(context)}`, `--site-name=${siteName}`, `--account-name=${settings.admin_user}`, `--account-pass=${settings.admin_password}`, `--account-mail=${settings.admin_email}`, '--yes'))
  await context.run('Prepare writable files', 'docker', phpExec(context, 'sh', '-lc', 'mkdir -p web/sites/default/files && chmod 0777 web/sites/default/files'))
  await context.run('Verify Drupal', 'docker', phpExec(context, 'vendor/bin/drush', 'status', '--field=drupal-version'))
  await context.setProjectMetadata({ drupalVersion: 'Drupal 11' })
  await context.saveCredentials({ platform: context.moduleId, adminUrl: `${context.urls.https}/user/login`, username: String(settings.admin_user), password: String(settings.admin_password), email: String(settings.admin_email) })
}

exports.projectTool = async function projectTool(context) {
  if (context.toolId !== 'rebuild-cache') throw new Error(`Unknown Drupal tool '${context.toolId}'`)
  await context.run('Rebuild Drupal cache', 'docker', phpExec(context, 'vendor/bin/drush', 'cache:rebuild'))
}
