import { ipcMain } from 'electron'
import { join } from 'path'
import { getProjectConfigByRoot, getProjectRoot } from '../auroraEngine'
import { startLogStream } from '../commandRunner'

function nativeLogFiles(root: string, service: string): string[] {
  const logs = join(root, '.aurora', 'native', 'logs')
  const files: Record<string, string[]> = {
    database: ['database-process.log', 'mariadb.log'],
    php: ['php-process.log', 'php.log'],
    web: ['web-process.log', 'nginx.log', 'nginx-access.log']
  }
  const selected = files[service]
  if (!selected) throw new Error(`Unknown native service '${service}'.`)
  return selected.map((file) => join(logs, file))
}

export function registerLogsIpc(): void {
  ipcMain.handle(
    'logs:start',
    async (event, operationId: string, name: string, service: string) => {
      const root = await getProjectRoot(name)
      const config = await getProjectConfigByRoot(root)
      if (config.runtimeEngine === 'native') {
        startLogStream(
          operationId,
          'tail',
          ['-n', '200', '-F', ...nativeLogFiles(root, service)],
          event.sender,
          { cwd: root }
        )
        return
      }
      startLogStream(
        operationId,
        'docker',
        ['compose', '-f', `${root}/.aurora/compose.yaml`, 'logs', '-f', '--tail', '200', service],
        event.sender,
        { cwd: root }
      )
    }
  )
}
