import { dts } from 'bun-plugin-dtsx'

async function build() {
  await Bun.build({
    entrypoints: ['src/index.ts'],
    outdir: './dist',
    plugins: [dts()],
    target: 'node',
  })

  // Build the CLI
  await Bun.build({
    entrypoints: ['bin/cli.ts'],
    target: 'bun',
    outdir: './dist/bin',
    plugins: [dts()],
  })
}

build()
