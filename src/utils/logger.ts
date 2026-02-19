import process from 'node:process'
import { Logger } from '@stacksjs/clarity'

// Determine log level via env (falls back to info). Only allow levels supported by clarity Logger
const envLevel = (process.env.AAX_LOG_LEVEL || '').toLowerCase()
const allowedLevels = ['error', 'info', 'debug'] as const
type AllowedLevel = typeof allowedLevels[number]
const level: AllowedLevel = (allowedLevels as readonly string[]).includes(envLevel) ? (envLevel as AllowedLevel) : 'info'

// Create a logger instance with a fancy UI
export const logger: Logger = new Logger('aax', {
  fancy: true,
  level,
  showTags: true,
})

/**
 * Format time in milliseconds to HH:MM:SS
 */
export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * Report an error with optional heading, details and hints.
 * In debug mode (AAX_LOG_LEVEL=debug or AAX_DEBUG=1), also prints stack traces when available.
 */
export function reportError(
  error: unknown,
  options?: {
    heading?: string
    details?: string
    hints?: string[]
  },
): void {
  const isDebug = level === 'debug' || process.env.AAX_DEBUG === '1'

  const heading = options?.heading
  const details = options?.details
  const hints = options?.hints || []

  const errObj = normalizeError(error)

  if (heading)
    logger.error(heading)

  if (errObj.message)
    logger.error(errObj.message)

  if (details)
    logger.warn(details)

  for (const hint of hints)
    logger.warn(`Hint: ${hint}`)

  if (isDebug && errObj.stack)
    logger.debug(errObj.stack)
}

/**
 * Normalize unknown errors to a consistent shape.
 */
export function normalizeError(error: unknown): { message: string, stack?: string } {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack }
  }
  if (typeof error === 'string') {
    return { message: error }
  }
  try {
    return { message: JSON.stringify(error) }
  }
  catch {
    return { message: String(error) }
  }
}
