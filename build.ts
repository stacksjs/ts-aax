import { chmodSync } from 'node:fs'
import { dts } from 'bun-plugin-dtsx'

async function build() {
  await Bun.build({
    entrypoints: ['src/index.ts'],
    outdir: './dist',
    plugins: [dts()],
    target: 'node',
  })

  // Build the CLI
  const cliBuild = await Bun.build({
    entrypoints: ['bin/cli.ts'],
    target: 'bun',
    outdir: './dist/bin',
    plugins: [dts()],
    banner: '#!/usr/bin/env bun\n',
  })

  // Make the CLI executable
  if (cliBuild.outputs.length > 0) {
    for (const output of cliBuild.outputs) {
      if (output.path.endsWith('.js')) {
        chmodSync(output.path, 0o755)
      }
    }
  }
}

build()
