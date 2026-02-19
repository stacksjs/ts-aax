import { resolve } from 'node:path'
import process from 'node:process'
import { CAC } from 'cac'
import { version } from '../package.json'
import { config, convertAAX, isValidActivationCode, splitToChapters } from '../src'
import { getActivationBytesFromAudibleCli } from '../src/utils/activation'
import { logger } from '../src/utils/logger'

const cli = new CAC('aax')

interface ConvertOptions {
  output?: string
  format?: 'm4a' | 'm4b'
  code?: string
  chapters?: boolean
  verbose?: boolean
  flatFolderStructure?: boolean
  seriesTitleInFolderStructure?: boolean
  useNamedChapters?: boolean
}

cli
  .command('convert <input>', 'Convert AAX audiobook to M4A/M4B format')
  .option('-o, --output <dir>', 'Output directory (default: ./converted)')
  .option('-f, --format <format>', 'Output format: m4a, m4b (default: m4b)')
  .option('-c, --code <code>', 'Audible activation code (will be auto-detected if not provided)')
  .option('--chapters', 'Preserve chapter information (default: true)')
  .option('-v, --verbose', 'Enable verbose logging')
  .option('--flat-folder-structure', 'Use flat folder structure')
  .option('--series-title-in-folder-structure', 'Include series title in folder structure')
  .option('--use-named-chapters', 'Use named chapters if available')
  .action(async (input: string, options: ConvertOptions = {}) => {
    // Set verbose mode
    if (options.verbose !== undefined) {
      config.verbose = options.verbose
    }

    // Validate activation code if provided
    if (options.code && !isValidActivationCode(options.code)) {
      logger.error('Invalid activation code format. Should be an 8-character hex string.')
      process.exit(1)
    }

    const result = await convertAAX({
      inputFile: resolve(input),
      outputDir: options.output || config.outputDir,
      outputFormat: options.format || config.outputFormat,
      activationCode: options.code || config.activationCode,
      chaptersEnabled: options.chapters ?? config.chaptersEnabled,
      flatFolderStructure: options.flatFolderStructure ?? config.flatFolderStructure,
      seriesTitleInFolderStructure: options.seriesTitleInFolderStructure ?? config.seriesTitleInFolderStructure,
      useNamedChapters: options.useNamedChapters ?? config.useNamedChapters,
    })

    if (!result.success) {
      process.exit(1)
    }
  })

cli
  .command('split <input>', 'Convert AAX audiobook and split by chapters')
  .option('-o, --output <dir>', 'Output directory (default: ./converted)')
  .option('-f, --format <format>', 'Output format: m4a, m4b (default: m4b)')
  .option('-c, --code <code>', 'Audible activation code (will be auto-detected if not provided)')
  .option('-v, --verbose', 'Enable verbose logging')
  .action(async (input: string, options: ConvertOptions = {}) => {
    // Set verbose mode
    if (options.verbose !== undefined) {
      config.verbose = options.verbose
    }

    // Validate activation code if provided
    if (options.code && !isValidActivationCode(options.code)) {
      logger.error('Invalid activation code format. Should be an 8-character hex string.')
      process.exit(1)
    }

    const result = await splitToChapters({
      inputFile: resolve(input),
      outputDir: options.output || config.outputDir,
      outputFormat: options.format || config.outputFormat,
      activationCode: options.code || config.activationCode,
    })

    if (!result.success) {
      process.exit(1)
    }
  })

// Add a new command to set up audible-cli and get activation bytes
cli
  .command('setup-audible', 'Set up the Audible CLI and retrieve activation bytes')
  .option('-v, --verbose', 'Enable verbose logging')
  .action(async (options: { verbose?: boolean } = {}) => {
    if (options.verbose !== undefined) {
      config.verbose = options.verbose
    }

    await logger.box('Setting up Audible CLI')
    logger.info('You may be prompted to log in to your Audible account.')
    logger.info('Follow the prompts in the terminal to complete the setup.')

    const activationCode = getActivationBytesFromAudibleCli()

    if (activationCode) {
      logger.success(`Successfully retrieved activation bytes: ${activationCode.substring(0, 2)}******`)
      logger.info('\nYou can now use this activation code with the convert command:')
      logger.info(`aax convert your-audiobook.aax -c ${activationCode}`)
      logger.info('The activation code has been saved and will be used automatically for future conversions.')
    }
    else {
      logger.error('Failed to retrieve activation bytes from Audible CLI.')
      logger.info('\nYou can try the manual setup process:')
      logger.info('1. Run: ./audible quickstart')
      logger.info('2. Follow the prompts to log in to your Audible account')
      logger.info('3. Once set up, run: ./audible activation-bytes')
      logger.info('4. Note the activation code (an 8-character hex string like "2c1eeb0a")')
      logger.info('5. Use the code with the convert command:')
      logger.info('   aax convert your-audiobook.aax -c YOUR_ACTIVATION_CODE')
    }
  })

cli.help()
cli.version(version)
cli.parse()
