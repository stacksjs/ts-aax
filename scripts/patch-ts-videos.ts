/**
 * Patch ts-videos monorepo package.json files after install.
 *
 * The ts-videos dependency is a GitHub monorepo. When installed via
 * `github:stacksjs/ts-videos`, bun gets the monorepo root which doesn't
 * have subpath exports. The actual packages with exports are nested inside
 * `packages/ts-videos` and `packages/mp4`.
 *
 * This script patches the installed package.json files to add proper
 * exports pointing to the TypeScript source files.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')

function patchPackage(
  installedPkgPath: string,
  subPkgPath: string,
  newName: string,
  srcPrefix: string,
): void {
  try {
    const subPkg = JSON.parse(readFileSync(resolve(ROOT, subPkgPath), 'utf8'))
    const installedPkg = JSON.parse(readFileSync(resolve(ROOT, installedPkgPath), 'utf8'))

    if (installedPkg.name === newName && installedPkg.exports) {
      // Already patched
      return
    }

    const exports: Record<string, { import: string }> = {}
    for (const key of Object.keys(subPkg.exports || {})) {
      if (key === '.') {
        exports['.'] = { import: `./${srcPrefix}/index.ts` }
      }
      else {
        const name = key.replace('./', '')
        exports[key] = { import: `./${srcPrefix}/${name}.ts` }
      }
    }

    installedPkg.name = newName
    installedPkg.exports = exports
    writeFileSync(resolve(ROOT, installedPkgPath), JSON.stringify(installedPkg, null, 2))
    console.log(`Patched ${installedPkgPath} with ${Object.keys(exports).length} exports`)
  }
  catch (e) {
    console.warn(`Warning: Could not patch ${installedPkgPath}: ${(e as Error).message}`)
  }
}

// Patch ts-videos (main package)
patchPackage(
  'node_modules/ts-videos/package.json',
  'node_modules/ts-videos/packages/ts-videos/package.json',
  'ts-videos',
  'packages/ts-videos/src',
)

// Patch @ts-videos/mp4
patchPackage(
  'node_modules/@ts-videos/mp4/package.json',
  'node_modules/ts-videos/packages/mp4/package.json',
  '@ts-videos/mp4',
  'packages/mp4/src',
)
