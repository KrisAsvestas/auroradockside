import { describe, expect, it } from 'vitest'
import { renderMariaDbConfig, renderNginxConfig, renderPhpFpmConfig } from './nativeProject'

const project = {
  name: 'demo',
  root: '/tmp/aurora demo',
  docroot: 'public',
  ports: { http: 41001, php: 41002, database: 41003, node: 41004 }
}

describe('native project configuration', () => {
  it('isolates PHP-FPM on its allocated loopback port', () =>
    expect(renderPhpFpmConfig(project)).toContain('listen = 127.0.0.1:41002'))
  it('routes nginx PHP requests to the project PHP-FPM service', () => {
    const config = renderNginxConfig(project)
    expect(config).toContain('listen 127.0.0.1:41001')
    expect(config).toContain('fastcgi_pass 127.0.0.1:41002')
    expect(config).toContain('location ~ \\.php$')
    expect(config).toContain('aurora demo/public')
  })
  it('isolates MariaDB data and networking', () => {
    const config = renderMariaDbConfig(project, '/tmp/aurora-runtime')
    expect(config).toContain('bind-address=127.0.0.1')
    expect(config).toContain('port=41003')
    expect(config).toContain('/.aurora/native/data/mariadb')
  })
})
