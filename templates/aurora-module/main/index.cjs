'use strict'

exports.projectCreate = async function projectCreate(context) {
  await context.run('Provision application', 'docker', ['compose', '-f', `${context.directory}/.aurora/compose.yaml`, 'up', '-d', '--build', '--remove-orphans'])
}

exports.projectStart = async function projectStart() {
  // Optional: migrations, health checks, or other work after containers start.
}

exports.projectRemove = async function projectRemove() {
  // Optional: remove project-scoped resources before the module/project is removed.
}

exports.packageUninstall = async function packageUninstall() {
  // Optional: remove global resources before the installed .pac package is deleted.
}

exports.projectTool = async function projectTool(context) {
  if (context.toolId === 'example-action') {
    await context.run('Example action', 'docker', ['compose', '-f', `${context.directory}/.aurora/compose.yaml`, 'ps'])
  }
}
