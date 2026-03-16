<p align="center"><img src="https://github.com/stacksjs/aax/blob/main/.github/art/cover.jpg?raw=true" alt="Social Card of this repo"></p>

# AAX Audio Converter

A TypeScript library and CLI tool for converting Audible AAX audiobooks to standard MP3, M4A, or M4B formats.

## Features

- Convert AAX files to MP3, M4A, or M4B formats
- Preserve chapter information
- Automatically detect Audible activation code
- Split audiobooks by chapters
- Simple command-line interface

## Get Started

It's rather simple to get started:

```bash
# Install globally
npm install -g @stacksjs/aax

# Or use with npx
npx @stacksjs/aax

# Convert an AAX file
aax convert your-audiobook.aax
```

### Requirements

- `ffmpeg` & [`audible`](https://github.com/mkb79/audible-cli) must be installed and available in your PATH

## Developer Experience (DX)

This package comes pre-configured with the following:

- [Powerful Build Process](https://github.com/oven-sh/bun) - via Bun
- [Fully Typed APIs](https://www.typescriptlang.org/) - via TypeScript
- [Documentation-ready](https://vitepress.dev/) - via VitePress
- [CLI & Binary](https://www.npmjs.com/package/bunx) - via Bun & CAC
- [Be a Good Commitizen](https://www.npmjs.com/package/git-cz) - pre-configured Commitizen & git-cz setup
- [Built With Testing In Mind](https://bun.sh/docs/cli/test) - pre-configured unit-testing
- [ESLint](https://eslint.org/) - for code linting
- [GitHub Actions](https://github.com/features/actions) - runs your CI

## Changelog

Please see our [releases](https://github.com/stacksjs/aax/releases) page for more information on what has changed recently.

## Contributing

Please review the [Contributing Guide](https://github.com/stacksjs/contributing) for details.

## Stargazers

[![Stargazers over time](https://starchart.cc/stacksjs/aax.svg?variant=adaptive)](https://starchart.cc/stacksjs/aax)

## Community

For help, discussion about best practices, or any other conversation that would benefit from being searchable:

[Discussions on GitHub](https://github.com/stacksjs/aax/discussions)

For casual chit-chat with others using this package:

[Join the Stacks Discord Server](https://discord.gg/stacksjs)

## Postcardware

"Software that is free, but hopes for a postcard." We love receiving postcards from around the world showing where Stacks is being used! We showcase them on our website too.

Our address: Stacks.js, 12665 Village Ln #2306, Playa Vista, CA 90094, United States 🌎

## Credits

- [@audiamus](https://github.com/audiamus) for the original [AaxAudioConverter](https://github.com/audiamus/AaxAudioConverter)

## Sponsors

We would like to extend our thanks to the following sponsors for funding Stacks development. If you are interested in becoming a sponsor, please reach out to us.

- [JetBrains](https://www.jetbrains.com/)
- [The Solana Foundation](https://solana.com/)

## License

The MIT License (MIT). Please see [LICENSE](/license) for more information.

Made with 💙

<!-- Badges -->

<!-- [codecov-src]: https://img.shields.io/codecov/c/gh/stacksjs/rpx/main?style=flat-square -->
