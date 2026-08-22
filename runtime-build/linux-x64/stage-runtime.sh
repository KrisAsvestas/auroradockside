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
copy_binary_and_libraries /usr/bin/mariadb-install-db
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

for entry in 'php:/usr/local/bin/php' 'php-fpm:/usr/local/sbin/php-fpm' 'nginx:/usr/sbin/nginx' 'mariadbd:/usr/bin/mariadbd' 'mariadb-install-db:/usr/bin/mariadb-install-db'; do
  name=${entry%%:*}
  target=${entry#*:}
  cat > "$stage/bin/$name" <<EOF
#!/bin/sh
exec "\$(dirname "\$0")/aurora-exec" "$target" "\$@"
EOF
  chmod +x "$stage/bin/$name"
done

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
    { "id": "mariadb", "version": "$mariadb_version", "executable": "bin/mariadbd" }
  ]
}
EOF
