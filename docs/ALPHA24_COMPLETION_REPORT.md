# Aurora Dockside 2.0.0-alpha.24 completion report

## Source

- Branch: `architecture/external-modules`
- External-module contract completion commit: `5409d91`
- Protected Alpha 23 baseline was not modified.

## Architecture

- Application packages are discovered and installed into Aurora's Electron user-data `modules` directory.
- The module registry is invalidated after install, update, and uninstall operations.
- Package manifests are validated for identity, version, category, dependencies, conflicts, settings, Core/API compatibility, project contributions, and safe relative entry paths.
- Native `.pac` files are ZIP-compressed Aurora packages with `manifest.json` at archive root.
- A `.pac` placed beside the AppImage or in its `modules` folder is discovered automatically and appears in the Modules screen.
- `.pac` inspection rejects encrypted entries, symbolic links, path traversal, absolute/drive paths, excessive entry counts, and expanded archives larger than 256 MiB before extraction.
- Installation uses staging plus rollback-safe replacement, so a failed update preserves the currently installed module.
- Application choices in New Project come only from the installed-module registry.
- Project actions and metadata summaries are declarative module contributions. Core no longer contains WordPress-specific admin or multisite presentation.
- The `moduleMetadata` capability is the versioned bridge used by trusted module lifecycle hooks.
- Alpha 23's legacy `wordpressMultisite` configuration value is read only by a compatibility adapter and exposed as generic module metadata. It is not used to identify the application.

## WordPress module

WordPress provisioning resides in `packages/aurora-module-wordpress`, including:

- Setup schema and supported databases
- WP-CLI download, configuration, installation, and verification
- Single-site and multisite conversion
- Permalinks, `WP_DEBUG`, and local environment configuration
- Credential persistence through a Core capability
- Project metadata, Application Admin, and conditional Network Admin contributions

Core contains no `type === 'wordpress'` or `moduleId === 'wordpress'` behavior.

## Verification

Commands completed successfully:

```text
npm run typecheck
npm run test:run
npm run build
npx electron-builder --linux AppImage
```

Automated result: 6 test files and 26 tests passed. Coverage includes:

- Empty registry
- Available local packages
- Valid installation and registry refresh
- Invalid and incompatible manifest rejection
- Unsafe package path and symbolic-link rejection
- `.pac` discovery, installation, traversal rejection, and archive symlink rejection
- Package update
- Registry refresh after uninstall
- Preservation of source packages and existing project data
- New Project empty state
- Application appearing after install and disappearing after uninstall
- Existing-project missing-module state
- Validation of the independently packaged WordPress contract

Live project smoke result for project `24`:

- PHP 8.5, Apache, Node 24, MySQL 8.4, and Adminer running
- MySQL health check passed
- Project HTTPS returned HTTP 200
- `/wp-admin/` resolved to the WordPress login page without a redirect loop
- Copyable operation diagnostics captured a successful start with exit code 0

## Artifacts

- Core AppImage: `/home/reaper/Documents/Codex/aurora/dist/final-alpha24/aurora-dockside-2.0.0-alpha.24.AppImage`
- Directly installable WordPress package: `/home/reaper/Documents/Codex/aurora/dist/final-alpha24/aurora-module-wordpress-1.2.0.pac`
- Directly installable unpacked WordPress package: `/home/reaper/Documents/Codex/aurora/packages/aurora-module-wordpress`

SHA-256:

```text
1964de899632f7dca86b5ee6485d5c2bc8dc0cffcc7a9de4479ea7eef25e9e76  aurora-dockside-2.0.0-alpha.24.AppImage
d2165af4b75ab888c6d35a750a449205123866231ba5e98e1cbe9bcaa8738f46  aurora-module-wordpress-1.2.0.pac
```

## Known limitations

- Clean-registry install/remove behavior was exercised through the real registry implementation in automated temporary-directory tests. The live GUI smoke used the already installed local WordPress package and project `24`.
- AppImage systems without working FUSE can use `--appimage-extract` and launch `squashfs-root/AppRun --no-sandbox`.
