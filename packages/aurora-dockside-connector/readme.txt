=== Aurora Dockside Connector ===
Contributors: auroradockside
Tags: local development, migration, development
Requires at least: 6.5
Tested up to: 6.8
Requires PHP: 8.0
Stable tag: 0.1.0
License: GPLv2 or later

An original, secure connector between WordPress and Aurora Dockside.

== Description ==

Aurora Dockside Connector exposes authenticated site metadata, a paginated file manifest, and a database inventory to Aurora Dockside. Authentication uses WordPress Application Passwords and requires an administrator account.

Version 0.1 is deliberately read-only. It does not modify the production database or production files.

== Installation ==

1. Upload the plugin ZIP in Plugins → Add New → Upload Plugin.
2. Activate Aurora Dockside Connector.
3. Open Tools → Aurora Dockside.
4. Create an Application Password from Users → Profile.

== Changelog ==

= 0.1.0 =
* Initial read-only connection API.
* Site and runtime discovery.
* Paginated content and uploads manifests.
* Database table inventory.
