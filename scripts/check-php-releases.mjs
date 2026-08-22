import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const sourceUrl = 'https://www.php.net/releases/index.php?json&version=8&max=30'
const baselinePath = resolve('runtime/upstream-baseline.json')
const reportArgument = process.argv.indexOf('--report')
const reportPath = reportArgument >= 0 ? process.argv[reportArgument + 1] : undefined

function latestByBranch(releases) {
  const result = {}
  for (const version of Object.keys(releases)) {
    if (!/^8\.[2-5]\.\d+$/.test(version)) continue
    const branch = version.split('.').slice(0, 2).join('.')
    if (!result[branch] || Number(version.split('.')[2]) > Number(result[branch].split('.')[2])) result[branch] = version
  }
  return result
}

const baseline = JSON.parse(await readFile(baselinePath, 'utf8'))
const response = await fetch(sourceUrl, { headers: { 'user-agent': 'Aurora-Dockside-Runtime-Watcher/1.0' } })
if (!response.ok) throw new Error(`PHP release feed returned HTTP ${response.status}.`)
const releases = await response.json()
const latest = latestByBranch(releases)
const updates = Object.entries(latest)
  .filter(([branch, version]) => baseline.php[branch] !== version)
  .map(([branch, version]) => ({ branch, packaged: baseline.php[branch] || 'not tracked', upstream: version, security: releases[version]?.tags?.includes('security') === true }))

const lines = updates.length
  ? ['# PHP runtime releases need packaging', '', 'The official PHP release feed contains versions newer than Aurora’s tracked packaging baseline.', '', '| Branch | Aurora baseline | Upstream | Security release |', '| --- | --- | --- | --- |', ...updates.map((update) => `| ${update.branch} | ${update.packaged} | ${update.upstream} | ${update.security ? 'Yes' : 'No'} |`), '', `Source: ${sourceUrl}`, '', 'After packages pass platform tests, update `runtime/upstream-baseline.json` and the signed runtime catalog.']
  : ['# PHP runtime release check', '', 'No untracked PHP releases were found.']

if (reportPath) await writeFile(reportPath, `${lines.join('\n')}\n`, 'utf8')
process.stdout.write(`${JSON.stringify({ updates, latest })}\n`)
