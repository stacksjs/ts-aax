# Claude Code Guidelines

## About

A TypeScript library and CLI tool for converting Audible AAX audiobooks to M4B or M4A. Conversion is a lossless decrypt-and-remux of the original AAC stream (no transcoding), done entirely in TypeScript via `ts-videos` — `ffmpeg` is not required. It preserves chapter markers, metadata, and cover art, supports splitting audiobooks into one file per chapter, and can automatically detect the Audible activation code via the `audible` CLI integration (the CLI is optional; an activation code can also be passed directly). Configuration is done via `aax.config.ts` with options for output format, folder structure, and chapter handling.

## Linting

- Use **pickier** for linting — never use eslint directly
- Run `bunx --bun pickier .` to lint, `bunx --bun pickier . --fix` to auto-fix
- When fixing unused variable warnings, prefer `// eslint-disable-next-line` comments over prefixing with `_`

## Frontend

- Use **stx** for templating — never write vanilla JS (`var`, `document.*`, `window.*`) in stx templates
- Use **crosswind** as the default CSS framework which enables standard Tailwind-like utility classes
- stx `<script>` tags should only contain stx-compatible code (signals, composables, directives)

## Dependencies

- **buddy-bot** handles dependency updates — not renovatebot
- **better-dx** provides shared dev tooling as peer dependencies — do not install its peers (e.g., `typescript`, `pickier`, `bun-plugin-dtsx`) separately if `better-dx` is already in `package.json`
- If `better-dx` is in `package.json`, ensure `bunfig.toml` includes `linker = "hoisted"`

## Commits

- Use conventional commit messages (e.g., `fix:`, `feat:`, `chore:`)
