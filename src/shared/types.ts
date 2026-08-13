export type ProjectStatus = 'running' | 'stopped' | 'paused' | 'starting' | 'stopping' | string

export interface AuroraProjectSummary {
  name: string
  status: ProjectStatus
  status_desc: string
  type: string
  approot: string
  shortroot: string
  docroot: string
  primary_url: string
  httpurl: string
  httpsurl: string
  mutagen_enabled: boolean
  mutagen_status?: string
}

export interface AuroraServiceHostPortMapping {
  exposed_port: string
  host_port: string
}

export interface AuroraService {
  short_name: string
  full_name: string
  status: string
  image: string
  exposed_ports: string
  host_ports: string
  host_ports_mapping: AuroraServiceHostPortMapping[]
  http_url?: string
  https_url?: string
  host_http_url?: string
  host_https_url?: string
  virtual_host?: string
  'describe-info'?: string
  'describe-url-port'?: string
}

export interface AuroraDbInfo {
  database_type: string
  database_version: string
  dbPort: string
  dbname: string
  host: string
  password: string
  published_port: number
  username: string
}

export interface AuroraProjectDetail extends AuroraProjectSummary {
  database_type: string
  database_version: string
  dbinfo: AuroraDbInfo
  hostname: string
  hostnames: string[]
  httpURLs: string[]
  httpsURLs: string[]
  urls: string[]
  php_version?: string
  nodejs_version?: string
  webserver_type?: string
  performance_mode?: string
  router: string
  router_status?: string
  certificate_status?: 'generated' | 'missing'
  ca_trust_status?: 'trusted' | 'not-trusted' | 'unknown'
  firefox_trust_status?: 'trusted' | 'not-trusted' | 'unavailable' | 'unknown'
  chromium_trust_status?: 'trusted' | 'not-trusted' | 'unavailable' | 'unknown'
  wordpress_multisite?: 'none' | 'subdirectory' | 'subdomain'
  wordpress_network_admin_url?: string
  adminer_url?: string
  services: Record<string, AuroraService>
  xdebug_enabled: boolean
}

export interface AuroraSiteCredentials {
  platform: string
  adminUrl: string
  username: string
  password: string
  email: string
}

export interface AuroraStackOptions {
  phpVersion: string
  nodeVersion: string
  database: 'mariadb' | 'postgres'
  databaseVersion: string
  adminer: boolean
  redis: boolean
  mailpit: boolean
  xdebug: boolean
}

export interface EnvironmentUpdate {
  phpVersion?: string
  nodeVersion?: string
  webserverType?: string
  database?: string
  xdebugEnabled?: boolean
  primaryProtocol?: 'http' | 'https'
}

export interface AuroraSnapshot {
  Name: string
  Created: string
}


export type AuroraModuleCategory = 'application' | 'service' | 'tool'
export type AuroraModuleSettingType = 'boolean' | 'select' | 'text' | 'number'

export interface AuroraModuleSetting {
  id: string
  label: string
  type: AuroraModuleSettingType
  default: string | number | boolean
  options?: string[]
}

export interface AuroraModuleManifest {
  id: string
  name: string
  version: string
  category: AuroraModuleCategory
  description: string
  icon?: string
  dependencies: string[]
  conflicts: string[]
  defaults?: { docroot?: string }
  settings: AuroraModuleSetting[]
  compose?: {
    service: string
    image: string
    ports?: number[]
    dependsOn?: string[]
  }
}

export interface AuroraInstalledModule {
  id: string
  name: string
  version: string
  category: AuroraModuleCategory
}

export interface AuroraAddonRegistryEntry {
  title: string
  github_url: string
  description: string
  user: string
  repo: string
  repo_id: number
  default_branch: string
  tag_name: string | null
  engine_version_constraint: string
  dependencies: string[] | null
  type: string
  created_at: string
  updated_at: string
  workflow_status: string
  stars: number
}

export interface AuroraInstalledAddon {
  Name: string
  Repository: string
  Version: string
  Dependencies: string[] | null
  InstallDate: string
  ProjectFiles: string[] | null
  GlobalFiles: string[] | null
  RemovalActions: string[] | null
}

export interface TerminalDataEvent {
  operationId: string
  stream: 'stdout' | 'stderr'
  chunk: string
}

export interface TerminalExitEvent {
  operationId: string
  exitCode: number | null
  cancelled: boolean
}

export interface LogDataEvent {
  operationId: string
  stream: 'stdout' | 'stderr'
  chunk: string
}

export interface LogExitEvent {
  operationId: string
}
