export type ProjectStatus = 'running' | 'stopped' | 'paused' | 'starting' | 'stopping' | string
export type AuroraRuntimeEngine = 'container' | 'native'

export interface AuroraNativeRuntimeComponent {
  id:
    | 'php'
    | 'nginx'
    | 'apache'
    | 'mariadb'
    | 'mariadb-client'
    | 'mariadb-dump'
    | 'mysql'
    | 'postgres'
    | 'node'
    | 'composer'
    | 'wp-cli'
    | 'drush'
    | 'adminer'
  version: string
  executable: string
  sha256: string
}

export interface AuroraNativeRuntimeManifest {
  schema: 1
  runtimeVersion: string
  platform: 'linux' | 'darwin' | 'win32'
  arch: 'x64' | 'arm64'
  components: AuroraNativeRuntimeComponent[]
}

export interface AuroraRuntimeStatus {
  selectedEngine: AuroraRuntimeEngine
  container: {
    available: boolean
    provider: 'docker' | 'podman' | null
    version?: string
    reason?: string
  }
  native: {
    available: boolean
    platform: string
    arch: string
    runtimeVersion?: string
    components: AuroraNativeRuntimeComponent[]
    reason?: string
  }
}

export type AuroraRuntimeComponentId = AuroraNativeRuntimeComponent['id']

export interface AuroraRuntimeCatalogRelease {
  component: AuroraRuntimeComponentId
  version: string
  platform: AuroraNativeRuntimeManifest['platform']
  arch: AuroraNativeRuntimeManifest['arch']
  channel: 'stable' | 'security'
  url: string
  sha256: string
}

export interface AuroraRuntimeCatalog {
  schema: 1
  generatedAt: string
  releases: AuroraRuntimeCatalogRelease[]
}

export interface AuroraRuntimeUpdate {
  component: AuroraRuntimeComponentId
  installedVersion: string
  availableVersion: string
  channel: AuroraRuntimeCatalogRelease['channel']
}

export interface AuroraRuntimeUpdateStatus {
  checkedAt: string
  source: 'bundled' | 'remote' | 'cache'
  updates: AuroraRuntimeUpdate[]
  message?: string
}

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
  module_available?: boolean
  missing_module_id?: string
  runtime_engine?: AuroraRuntimeEngine
  native_ports?: { http: number; php: number; database: number; node: number }
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
  module_metadata?: Record<string, string | number | boolean>
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

export interface AuroraRemoteSiteProfile {
  siteUrl: string
  wordpressUsername: string
  applicationPassword?: string
  sshHost: string
  sshPort: number
  sshUsername: string
  privateKeyPath: string
  remotePath: string
  configured?: boolean
}

export interface AuroraRemoteSiteStatus {
  connected: boolean
  platform: 'wordpress'
  siteName: string
  siteUrl: string
  wordpressVersion: string
  phpVersion: string
  databaseVersion: string
  connectorVersion: string
}

export interface AuroraStackOptions {
  runtimeEngine: AuroraRuntimeEngine
  phpVersion: string
  nodeVersion: string
  webServer: 'nginx' | 'apache'
  database: 'mariadb' | 'mysql' | 'postgres'
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
  optionLabels?: Record<string, string>
  placeholder?: string
  required?: boolean
  advanced?: boolean
  secret?: boolean
  icon?: 'title' | 'user' | 'key' | 'mail' | 'globe' | 'settings'
  span?: 1 | 2
}

export interface AuroraModuleManifest {
  id: string
  name: string
  version: string
  category: AuroraModuleCategory
  description: string
  icon?: string
  main?: string
  dependencies: string[]
  conflicts: string[]
  defaults?: { docroot?: string }
  settings: AuroraModuleSetting[]
  aurora: { core: string; moduleApi: string }
  creation?: {
    databases?: Array<'mariadb' | 'mysql' | 'postgres'>
    phpVersions?: string[]
    setup?: AuroraModuleSetting[]
    intro?: { title: string; description: string; icon?: string }
  }
  hooks?: Partial<Record<AuroraModuleLifecycleHook, AuroraModuleCommand[]>>
  project?: {
    adminPath?: string
    actions?: Array<{
      id: string
      label: string
      path: string
      metadataKey?: string
      hiddenValues?: Array<string | number | boolean>
    }>
    summary?: {
      metadataKey: string
      labels: Record<string, string>
      fallback?: string
    }
    tools?: Array<{ id: string; label: string }>
  }
  compose?: {
    service: string
    image: string
    ports?: number[]
    dependsOn?: string[]
  }
}

export type AuroraModuleLifecycleHook =
  'projectCreate' | 'projectStart' | 'projectRemove' | 'packageUninstall' | 'projectTool'

export interface AuroraModuleCommand {
  command: string
  args: string[]
  operationLabel?: string
}

export interface AuroraInstalledModule {
  id: string
  name: string
  version: string
  category: AuroraModuleCategory
}

export interface AuroraModuleInstallResult {
  manifest: AuroraModuleManifest
  installedPath: string
}

export interface AuroraAvailableModule {
  manifest: AuroraModuleManifest
  sourcePath: string
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
