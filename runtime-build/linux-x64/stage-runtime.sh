#!/bin/sh
set -eu

stage=/stage
root="$stage/root"

copy_file() {
  source_path="$1"
  destination="$root$source_path"
  mkdir -p "$(dirname "$destination")"
  cp -L "$source_path" "$destination"
}

copy_binary_and_libraries() {
  binary="$1"
  copy_file "$binary"
  scanelf --needed --nobanner "$binary" | awk '{ print $2 }' | tr ',' '\n' | while read -r library; do
    [ -n "$library" ] || continue
    library_path=$(find /lib /usr/lib /usr/local/lib -name "$library" -print -quit)
    [ -n "$library_path" ] || { echo "Missing library $library for $binary" >&2; exit 1; }
    copy_file "$library_path"
  done
}

copy_binary_and_libraries /usr/local/bin/php
copy_binary_and_libraries /usr/local/sbin/php-fpm
copy_binary_and_libraries /usr/sbin/nginx
copy_binary_and_libraries /usr/bin/mariadbd
copy_binary_and_libraries /usr/bin/mariadb
copy_binary_and_libraries /usr/bin/mariadb-dump
copy_binary_and_libraries /usr/bin/mariadb-install-db
copy_binary_and_libraries /usr/bin/my_print_defaults
copy_binary_and_libraries /usr/bin/resolveip
mkdir -p "$root/lib" "$root/usr/lib"
cp -aL /lib/. "$root/lib/"
cp -aL /usr/lib/. "$root/usr/lib/"

mkdir -p "$root/usr/local/lib/php/extensions"
if [ -d /usr/local/lib/php/extensions ]; then cp -a /usr/local/lib/php/extensions/. "$root/usr/local/lib/php/extensions/"; fi
mkdir -p "$root/usr/local/etc"
cp -a /usr/local/etc/php "$root/usr/local/etc/"
mkdir -p "$root/usr/share"
if [ -d /usr/share/mariadb ]; then cp -a /usr/share/mariadb "$root/usr/share/"; fi

cat > "$stage/bin/aurora-exec" <<'EOF'
#!/bin/sh
set -eu
runtime_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
target="$1"
shift
export LD_LIBRARY_PATH="$runtime_root/root/lib:$runtime_root/root/usr/lib:$runtime_root/root/usr/local/lib"
export PHPRC="$runtime_root/root/usr/local/etc/php"
export PHP_INI_SCAN_DIR="$runtime_root/root/usr/local/etc/php/conf.d"
exec "$runtime_root/root/lib/ld-musl-x86_64.so.1" --library-path "$LD_LIBRARY_PATH" "$runtime_root/root$target" "$@"
EOF
chmod +x "$stage/bin/aurora-exec"

for entry in 'php:/usr/local/bin/php' 'php-fpm:/usr/local/sbin/php-fpm' 'nginx:/usr/sbin/nginx' 'mariadbd:/usr/bin/mariadbd'; do
  name=${entry%%:*}
  target=${entry#*:}
  cat > "$stage/bin/$name" <<EOF
#!/bin/sh
exec "\$(dirname "\$0")/aurora-exec" "$target" "\$@"
EOF
  chmod +x "$stage/bin/$name"
done

for name in php php-fpm; do
  target=/usr/local/bin/php
  [ "$name" = php-fpm ] && target=/usr/local/sbin/php-fpm
  cat > "$stage/bin/$name" <<EOF
#!/bin/sh
runtime_root=\$(CDPATH= cd -- "\$(dirname -- "\$0")/.." && pwd)
extension_dir=\$(find "\$runtime_root/root/usr/local/lib/php/extensions" -mindepth 1 -maxdepth 1 -type d -print -quit)
exec "\$runtime_root/bin/aurora-exec" "$target" -d "extension_dir=\$extension_dir" "\$@"
EOF
  chmod +x "$stage/bin/$name"
done

# mariadb-install-db is a shell script that calls helpers below --basedir.
# Put the ELF programs behind relocatable wrappers so those calls also use the
# bundled musl loader instead of the host's /lib interpreter.
mkdir -p "$root/usr/libexec/aurora"
for name in mariadbd mariadb mariadb-dump my_print_defaults resolveip; do
  mv "$root/usr/bin/$name" "$root/usr/libexec/aurora/$name"
  cat > "$root/usr/bin/$name" <<EOF
#!/bin/sh
runtime_root=\$(CDPATH= cd -- "\$(dirname -- "\$0")/../../.." && pwd)
exec "\$runtime_root/bin/aurora-exec" "/usr/libexec/aurora/$name" "\$@"
EOF
  chmod +x "$root/usr/bin/$name"
done
cat > "$stage/bin/mariadb-install-db" <<'EOF'
#!/bin/sh
set -eu
runtime_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
exec /bin/sh "$runtime_root/root/usr/bin/mariadb-install-db" --basedir="$runtime_root/root/usr" "$@"
EOF
chmod +x "$stage/bin/mariadb-install-db"

# The public daemon launcher must now target the relocated ELF binary.
cat > "$stage/bin/mariadbd" <<'EOF'
#!/bin/sh
exec "$(dirname "$0")/aurora-exec" /usr/libexec/aurora/mariadbd "$@"
EOF
chmod +x "$stage/bin/mariadbd"

for name in mariadb mariadb-dump; do
  cat > "$stage/bin/$name" <<EOF
#!/bin/sh
exec "\$(dirname "\$0")/aurora-exec" "/usr/libexec/aurora/$name" "\$@"
EOF
  chmod +x "$stage/bin/$name"
done

cp /tmp/wp-cli.phar "$root/usr/local/bin/wp-cli.phar"
mkdir -p "$root/usr/share/aurora"
cp /tmp/adminer.php "$root/usr/share/aurora/adminer.php"
cat > "$stage/bin/wp" <<'EOF'
#!/bin/sh
runtime_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
exec "$runtime_root/bin/php" -d memory_limit=512M "$runtime_root/root/usr/local/bin/wp-cli.phar" "$@"
EOF
chmod +x "$stage/bin/wp"

php_version=$(php -r 'echo PHP_VERSION;')
nginx_version=$(nginx -v 2>&1 | sed 's#nginx version: nginx/##')
mariadb_version=$(mariadbd --version | sed -n 's/.* Ver \([^ -]*\).*/\1/p')
cat > "$stage/runtime.template.json" <<EOF
{
  "schema": 1,
  "runtimeVersion": "0.1.0",
  "platform": "linux",
  "arch": "x64",
  "components": [
    { "id": "php", "version": "$php_version", "executable": "bin/php-fpm" },
    { "id": "nginx", "version": "$nginx_version", "executable": "bin/nginx" },
    { "id": "mariadb", "version": "$mariadb_version", "executable": "bin/mariadbd" },
    { "id": "mariadb-client", "version": "$mariadb_version", "executable": "bin/mariadb" },
    { "id": "mariadb-dump", "version": "$mariadb_version", "executable": "bin/mariadb-dump" },
    { "id": "adminer", "version": "6.0.1", "executable": "root/usr/share/aurora/adminer.php" },
    { "id": "wp-cli", "version": "2.12.0", "executable": "bin/wp" }
  ]
}
EOF
