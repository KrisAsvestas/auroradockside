# macOS release build

The `macOS release` GitHub Actions workflow builds a universal Intel and Apple Silicon release containing:

- `Aurora Dockside.app`
- DMG installer
- ZIP updater artifact
- Embedded WordPress `.pac` catalog
- Separate WordPress `.pac`
- SHA-256 checksum manifest

Run it manually from **Actions → macOS release → Run workflow**, or push a version tag such as `v2.0.0-alpha.24`.

## Unsigned test build

No secrets are required. The workflow produces an unsigned DMG suitable for internal verification. macOS Gatekeeper will warn users because it is not signed or notarized.

## Signed and notarized release

Configure these GitHub Actions repository secrets:

| Secret | Purpose |
| --- | --- |
| `MAC_CERTIFICATE_P12` | Base64-encoded Developer ID Application `.p12` certificate |
| `MAC_CERTIFICATE_PASSWORD` | Password protecting the `.p12` certificate |
| `APPLE_API_KEY_P8` | App Store Connect API private key contents |
| `APPLE_API_KEY_ID` | App Store Connect API key ID |
| `APPLE_API_ISSUER` | App Store Connect API issuer ID |

The workflow refuses a partially configured release where a signing certificate is present but notarization credentials are missing.

## DMG contents

The mounted DMG contains the application, an Applications shortcut, and an **Aurora Modules** folder. The application also retains the module catalog internally at:

```text
Aurora Dockside.app/Contents/Resources/module-catalog/
└── wordpress-1.2.0.pac
```

The workflow verifies that the internal `.pac` is byte-for-byte identical to the separately uploaded package before publishing its artifacts.
