param(
  [string]$Stage = "dist/native-runtime-stage/win32-x64",
  [string]$PhpVersion = "8.5.9",
  [string]$NginxVersion = "1.30.4",
  [string]$MariaDbVersion = "11.8.8",
  [string]$WpCliVersion = "2.12.0",
  [string]$AdminerVersion = "6.0.1",
  [string]$RuntimeVersion = "0.1.0"
)

$ErrorActionPreference = "Stop"
$stagePath = [IO.Path]::GetFullPath($Stage)
$downloads = Join-Path ([IO.Path]::GetTempPath()) "aurora-native-downloads"
Remove-Item $stagePath -Recurse -Force -ErrorAction SilentlyContinue
New-Item $stagePath -ItemType Directory -Force | Out-Null
New-Item $downloads -ItemType Directory -Force | Out-Null

function Fetch([string]$Url, [string]$Destination) {
  Write-Host "Downloading $Url"
  Invoke-WebRequest -Uri $Url -OutFile $Destination
}

$phpZip = Join-Path $downloads "php.zip"
$nginxZip = Join-Path $downloads "nginx.zip"
$mariaZip = Join-Path $downloads "mariadb.zip"
Fetch "https://windows.php.net/downloads/releases/archives/php-$PhpVersion-nts-Win32-vs17-x64.zip" $phpZip
Fetch "https://nginx.org/download/nginx-$NginxVersion.zip" $nginxZip
Fetch "https://archive.mariadb.org/mariadb-$MariaDbVersion/winx64-packages/mariadb-$MariaDbVersion-winx64.zip" $mariaZip

$phpRoot = Join-Path $stagePath "bin/php"
$nginxParent = Join-Path $stagePath "bin/nginx-unpack"
$mariaParent = Join-Path $stagePath "bin/mariadb-unpack"
Expand-Archive $phpZip $phpRoot -Force
Expand-Archive $nginxZip $nginxParent -Force
Expand-Archive $mariaZip $mariaParent -Force

@'
extension_dir = "ext"
extension = mysqli
extension = pdo_mysql
extension = mbstring
extension = curl
extension = openssl
extension = zip
display_errors = On
log_errors = On
'@ | Set-Content (Join-Path $phpRoot "php.ini")

Move-Item (Join-Path $nginxParent "nginx-$NginxVersion") (Join-Path $stagePath "bin/nginx")
Move-Item (Join-Path $mariaParent "mariadb-$MariaDbVersion-winx64") (Join-Path $stagePath "bin/mariadb")
Remove-Item $nginxParent, $mariaParent -Recurse -Force

$tools = Join-Path $stagePath "tools"
New-Item $tools -ItemType Directory -Force | Out-Null
Fetch "https://github.com/wp-cli/wp-cli/releases/download/v$WpCliVersion/wp-cli-$WpCliVersion.phar" (Join-Path $tools "wp-cli.phar")
Fetch "https://github.com/vrana/adminer/releases/download/v$AdminerVersion/adminer-$AdminerVersion.php" (Join-Path $tools "adminer.php")

$template = @{
  schema = 1
  runtimeVersion = $RuntimeVersion
  platform = "win32"
  arch = "x64"
  components = @(
    @{ id = "php"; version = $PhpVersion; executable = "bin/php/php-cgi.exe" }
    @{ id = "nginx"; version = $NginxVersion; executable = "bin/nginx/nginx.exe" }
    @{ id = "mariadb"; version = $MariaDbVersion; executable = "bin/mariadb/bin/mariadbd.exe" }
    @{ id = "mariadb-client"; version = $MariaDbVersion; executable = "bin/mariadb/bin/mariadb.exe" }
    @{ id = "mariadb-dump"; version = $MariaDbVersion; executable = "bin/mariadb/bin/mariadb-dump.exe" }
    @{ id = "adminer"; version = $AdminerVersion; executable = "tools/adminer.php" }
    @{ id = "wp-cli"; version = $WpCliVersion; executable = "tools/wp-cli.phar" }
  )
}
$template | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $stagePath "runtime.template.json")
Write-Host $stagePath
