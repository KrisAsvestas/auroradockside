import { app } from 'electron'
import { readFile, readdir } from 'fs/promises'
import { join } from 'path'
import type { AuroraModuleManifest } from '../shared/types'

let cache: AuroraModuleManifest[] | null = null

function moduleDirectory(): string {
  return join(app.getAppPath(), 'resources', 'modules')
}

export async function getModuleRegistry(): Promise<AuroraModuleManifest[]> {
  if (cache) return cache
  const dir = moduleDirectory()
  const files = (await readdir(dir)).filter((file) => file.endsWith('.json')).sort()
  cache = await Promise.all(files.map(async (file) => JSON.parse(await readFile(join(dir, file), 'utf8')) as AuroraModuleManifest))
  return cache
}

export async function getModuleManifest(id: string): Promise<AuroraModuleManifest> {
  const module = (await getModuleRegistry()).find((item) => item.id === id)
  if (!module) throw new Error(`Unknown Aurora module '${id}'`)
  return module
}
