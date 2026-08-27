'use strict'

const { ZipArchive } = require('archiver')
const { createWriteStream } = require('fs')
const { lstat, readFile, readlink, readdir } = require('fs/promises')
const { join, relative, sep } = require('path')
const archiveDate = new Date('2000-01-01T00:00:00.000Z')

function archiveName(root, value) {
  return relative(root, value).split(sep).join('/')
}

async function appendDirectory(archive, root, directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name)
    const name = archiveName(root, absolute)
    const stats = await lstat(absolute)
    if (stats.isSymbolicLink()) {
      archive.symlink(name, await readlink(absolute), stats.mode)
    } else if (stats.isDirectory()) {
      archive.append('', { name: `${name}/`, date: archiveDate })
      await appendDirectory(archive, root, absolute)
    } else if (stats.isFile()) {
      archive.append(await readFile(absolute), { name, mode: stats.mode, date: archiveDate })
    }
  }
}

async function archiveDirectory(source, output) {
  const destination = createWriteStream(output)
  const archive = new ZipArchive({ zlib: { level: 9 } })
  const completed = new Promise((resolve, reject) => {
    destination.once('close', resolve)
    destination.once('error', reject)
    archive.once('error', reject)
  })
  archive.pipe(destination)
  await appendDirectory(archive, source, source)
  await archive.finalize()
  await completed
}

module.exports = archiveDirectory
