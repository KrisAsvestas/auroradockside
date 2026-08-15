# Aurora module template

Create a module with:

```sh
npm run module:new -- my-module "My Module"
```

Edit `manifest.json` and `main/index.cjs`, then package every module in `packages/`:

```sh
npm run build:modules
```

The resulting `.pac` file is written to `dist/module-catalog/`.

Lifecycle exports are optional. `projectCreate` runs during initial provisioning, `projectStart` after the containers start, `projectRemove` before project-scoped removal, and `packageUninstall` before the installed package is deleted. A manifest entry in `project.tools` calls `projectTool(context)` with its `id` in `context.toolId`.

The context provides `moduleId`, `hook`, `directory`, `projectName`, `settings`, `urls`, and `toolId`. It also provides `run(label, command, args)`, `ensureRouter()`, `setProjectMetadata(values)`, and `saveCredentials(values)`. Project-only values and helpers are unavailable to `packageUninstall`.
