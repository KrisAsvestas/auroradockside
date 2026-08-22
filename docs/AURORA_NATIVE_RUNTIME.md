# Aurora Native Runtime

Aurora Native is a per-platform PHP development engine that does not require Docker. The existing container engine remains supported while native runtime bundles are developed and verified.

## Runtime targets

- Linux: x64 and arm64
- macOS: Intel and Apple silicon
- Windows: x64, with arm64 evaluated after the first stable runtime

Each signed runtime bundle contains a `runtime.json` manifest plus versioned executables for PHP, web servers, databases, Node.js, and application tooling. Bundles install below Aurora's user-data directory and never modify system PHP or database installations.

Runtime archives are created from a staging directory with `npm run build:native-runtime -- <staging-directory> <output.tar.gz>`. The packager resolves every executable inside the staging root, calculates its SHA-256 checksum, writes the immutable `runtime.json`, excludes the build template, and creates the distributable archive. Dockside independently verifies those checksums before declaring a runtime available.

The first reproducible bundle target is Linux x64. Run `npm run build:native-linux-x64` on a Docker-capable build machine. Docker is used only to create the portable artifact; users of that artifact do not need Docker. The recipe pins PHP 8.5.9, nginx 1.30.4, and MariaDB 11.8.8 with their runtime libraries, runs version smoke checks outside the build container, and then invokes the normal checksum packager.

Dockside can install a bundled runtime or a user-selected runtime archive from Settings. Installation rejects absolute and parent-traversing archive entries, rejects symbolic links, verifies the target platform and architecture, and verifies every declared executable checksum before atomically replacing an older runtime. Electron packages include matching archives from `dist/native-runtime` when they are present at packaging time.

## Isolation model

Every project receives reserved loopback ports, generated service configuration, isolated database data, logs, PID files, and environment variables below `.aurora/native`. A shared Aurora router owns friendly HTTPS project hostnames. Project files remain directly accessible on the host.

## Delivery sequence

1. Runtime manifest, platform detection, checksum verification, and engine abstraction.
2. Native process supervisor and loopback port allocator.
3. Linux x64 bundle with PHP 8.4, nginx, and MariaDB 11.8.
4. WordPress provisioning, lifecycle, logs, database import/export, and Adminer.
5. macOS arm64/x64 and Windows x64 bundles.
6. Additional PHP/database versions, Apache, Drupal, Node.js, and developer services.

Native project creation must stay disabled until the platform bundle passes executable, service-health, database, routing, and cleanup checks. Existing projects default to the container engine for backward compatibility.

## Runtime update notifications

Dockside reads the bundled runtime catalog at startup and checks again every six hours. A remote catalog is accepted only when `AURORA_RUNTIME_CATALOG_PUBLIC_KEY` contains the Ed25519 public key and the adjacent `catalog.json.sig` validates. The last verified remote catalog is cached; otherwise Dockside falls back to its bundled trusted catalog.

The scheduled `runtime-release-watch.yml` workflow checks PHP's official JSON release feed every six hours. When a tracked PHP branch changes, it creates or updates a GitHub issue. It does not publish a runtime automatically: each platform package must be built, checksummed, tested, added to the catalog, and signed before users see it.
