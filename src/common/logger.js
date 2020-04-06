/**
 * This module contains the winston logger configuration.
 */

const { createLogger, format, transports } = require('winston')

const logger = createLogger({
  format: format.combine(
    format.json(),
    format.colorize(),
    format.printf((data) => `${new Date().toISOString()} - ${data.level}: ${data.message}`)
  )
})

// Log to console
logger.add(new transports.Console({
  stderrLevels: ['error'],
  level: 'info'
}))

/**
 * Logs complete error message with stack trace if present
 */
logger.logFullError = (err) => {
  if (err && err.stack) {
    logger.error(err.stack)
  } else {
    logger.error(JSON.stringify(err))
  }
}

module.exports = logger
