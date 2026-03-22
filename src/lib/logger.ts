/**
 * Structured Logging Utility for DuukaAfrica
 * 
 * Provides consistent logging with:
 * - Log levels (error, warn, info, debug)
 * - Structured metadata
 * - Timestamp and request context
 * - Environment-aware output (JSON in production, pretty in dev)
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug'

interface LogMeta {
  [key: string]: unknown
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  service: string
  environment: string
  meta?: LogMeta
}

const SERVICE_NAME = 'duukaafrica'
const ENVIRONMENT = process.env.NODE_ENV || 'development'
const LOG_LEVEL = (process.env.LOG_LEVEL as LogLevel) || (ENVIRONMENT === 'production' ? 'info' : 'debug')

const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] <= LOG_LEVELS[LOG_LEVEL]
}

function formatTimestamp(): string {
  return new Date().toISOString()
}

function formatForConsole(entry: LogEntry): string {
  const { timestamp, level, message, meta } = entry
  const levelColors: Record<LogLevel, string> = {
    error: '\x1b[31m', // red
    warn: '\x1b[33m',  // yellow
    info: '\x1b[36m',  // cyan
    debug: '\x1b[90m', // gray
  }
  const reset = '\x1b[0m'
  const color = levelColors[level]
  
  let output = `${timestamp} ${color}[${level.toUpperCase()}]${reset} ${message}`
  
  if (meta && Object.keys(meta).length > 0) {
    output += `\n  ${JSON.stringify(meta, null, 2)}`
  }
  
  return output
}

function createEntry(level: LogLevel, message: string, meta?: LogMeta): LogEntry {
  return {
    timestamp: formatTimestamp(),
    level,
    message,
    service: SERVICE_NAME,
    environment: ENVIRONMENT,
    ...(meta && Object.keys(meta).length > 0 && { meta }),
  }
}

function log(level: LogLevel, message: string, meta?: LogMeta): void {
  if (!shouldLog(level)) return
  
  const entry = createEntry(level, message, meta)
  
  if (ENVIRONMENT === 'production') {
    // JSON output for production (parseable by log aggregators)
    const output = JSON.stringify(entry)
    if (level === 'error') {
      console.error(output)
    } else if (level === 'warn') {
      console.warn(output)
    } else {
      console.log(output)
    }
  } else {
    // Pretty output for development
    const output = formatForConsole(entry)
    if (level === 'error') {
      console.error(output)
    } else if (level === 'warn') {
      console.warn(output)
    } else {
      console.log(output)
    }
  }
}

/**
 * Logger instance with structured logging methods
 */
export const logger = {
  /**
   * Log error messages - for exceptions and critical issues
   */
  error: (message: string, meta?: LogMeta) => log('error', message, meta),
  
  /**
   * Log warning messages - for potential issues that don't block operation
   */
  warn: (message: string, meta?: LogMeta) => log('warn', message, meta),
  
  /**
   * Log info messages - for significant events (requests, operations)
   */
  info: (message: string, meta?: LogMeta) => log('info', message, meta),
  
  /**
   * Log debug messages - for detailed debugging (dev only)
   */
  debug: (message: string, meta?: LogMeta) => log('debug', message, meta),
  
  /**
   * Log API request details
   */
  request: (method: string, path: string, meta?: LogMeta) => {
    log('info', `${method} ${path}`, { type: 'request', method, path, ...meta })
  },
  
  /**
   * Log API response details
   */
  response: (method: string, path: string, status: number, duration: number, meta?: LogMeta) => {
    log('info', `${method} ${path} ${status}`, { 
      type: 'response', 
      method, 
      path, 
      status, 
      duration: `${duration}ms`,
      ...meta 
    })
  },
  
  /**
   * Log database operations
   */
  db: (operation: string, table: string, meta?: LogMeta) => {
    log('debug', `DB ${operation} on ${table}`, { type: 'database', operation, table, ...meta })
  },
  
  /**
   * Log security events
   */
  security: (event: string, meta?: LogMeta) => {
    log('warn', `Security: ${event}`, { type: 'security', event, ...meta })
  },
}

export default logger
