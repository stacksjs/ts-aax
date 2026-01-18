import type { BunPressConfig } from 'bunpress'

const config: BunPressConfig = {
  name: 'AAX Audio Converter',
  description: 'A TypeScript library and CLI tool for converting Audible AAX audiobooks to standard MP3, M4A, or M4B formats',
  url: 'https://aax.sh',

  nav: [
    { text: 'Guide', link: '/guide/getting-started' },
    { text: 'CLI', link: '/guide/cli' },
    { text: 'Formats', link: '/guide/formats' },
    { text: 'GitHub', link: 'https://github.com/stacksjs/aax' },
  ],

  sidebar: {
    '/guide/': [
      {
        text: 'Getting Started',
        items: [
          { text: 'Introduction', link: '/intro' },
          { text: 'Installation', link: '/install' },
          { text: 'Getting Started', link: '/guide/getting-started' },
        ],
      },
      {
        text: 'Usage',
        items: [
          { text: 'CLI Reference', link: '/guide/cli' },
          { text: 'Output Formats', link: '/guide/formats' },
          { text: 'Configuration', link: '/config' },
        ],
      },
    ],
    '/features/': [
      {
        text: 'Features',
        items: [
          { text: 'Audio Conversion', link: '/features/audio-conversion' },
          { text: 'Batch Processing', link: '/features/batch-processing' },
          { text: 'Chapter Extraction', link: '/features/chapter-extraction' },
          { text: 'Metadata Handling', link: '/features/metadata' },
        ],
      },
    ],
    '/advanced/': [
      {
        text: 'Advanced',
        items: [
          { text: 'Configuration', link: '/advanced/configuration' },
          { text: 'Activation Bytes', link: '/advanced/activation-bytes' },
          { text: 'Performance', link: '/advanced/performance' },
          { text: 'CI/CD Integration', link: '/advanced/ci-cd' },
        ],
      },
    ],
  },

  themeConfig: {
    colors: {
      primary: '#f97316',
    },
  },
}

export default config
