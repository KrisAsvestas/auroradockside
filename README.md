# Aurora Dockside 2.0

Aurora Dockside is becoming a modular Docker-based local development platform for PHP and Node.js projects. Dockside is the Electron GUI; Aurora Engine owns project configuration, Docker Compose generation, runtimes, and modules.

## Alpha 2 module architecture

Each project stores its state in `.aurora/` and can be extended at runtime from the **Module Library**. Module manifests live in `resources/modules/*.json` and describe their category, settings, dependencies, conflicts, optional Docker service, and application defaults. Dockside renders module configuration controls from those manifests rather than hard-coding a UI for every module.

Bundled modules:

- Applications: WordPress, Laravel, Drupal
- Services: Redis
- Developer tools: Mailpit, Adminer

The PHP service is now built from `.aurora/Dockerfile.php` with common extensions and Composer. Installing/removing a service module regenerates Compose and reconciles the running project with `docker compose up -d --remove-orphans`. Application modules are mutually protected by manifest conflicts and can scaffold application source into an existing blank Aurora project.

## Development

```bash
npm install
npm run typecheck
npm run dev
```

Docker Engine with Docker Compose v2 is required.

## Project files

```text
project/
  .aurora/
    config.json
    compose.yaml
    nginx.conf
    Dockerfile.php
```

This is an alpha. Database snapshots/import/export and automatic HTTPS/router domains are still being rebuilt for the native Aurora Engine.

## Alpha 3 engine milestone

Aurora now owns database portability instead of delegating it to DDEV. MariaDB and PostgreSQL projects support compressed snapshots, restore, SQL/SQL.GZ import, and export through Docker Compose. Database containers include health checks and the web service waits for the database to become healthy before starting. Aurora also shuts down registered project stacks when Dockside exits.

Snapshots are stored per-project under `.aurora/snapshots/` and can be managed from the existing Database panel.


## Alpha 6 router

Aurora now starts a shared Traefik router on localhost ports 80 and 443 and attaches projects to the external `aurora-router` Docker network. New projects are exposed at both `http://<project>.aurora.localhost` and `https://<project>.aurora.localhost`; subdomain hosts are routed to the same project for WordPress multisite testing. HTTPS currently uses Traefik's generated local certificate, so browsers may show a trust warning until Aurora CA installation is added. The random localhost port remains published as a diagnostic fallback, but is no longer the primary project URL.
