// Structured logger + Express middleware.
//
// - Use `logger.info(...)` / `logger.error(...)` for application-level logs
//   that aren't tied to a specific HTTP request (boot, scheduled jobs).
// - Use `req.log.error(...)` inside route handlers — pino-http populates
//   req.log per request with an auto-generated request-id, so log lines
//   from a single request can be grepped by `req.id`.
//
// In production (NODE_ENV=production) we emit JSON-per-line which Railway's
// log aggregator can index. In development we use pretty-printed logs for
// readability.

const pino = require('pino');
const pinoHttp = require('pino-http');

const isProd = process.env.NODE_ENV === 'production';

const logger = pino({
  level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
  transport: isProd
    ? undefined
    : {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'HH:MM:ss.l', ignore: 'pid,hostname' }
      }
});

const httpLogger = pinoHttp({
  logger,
  // Don't log static asset / health-check requests — they swamp the log.
  autoLogging: {
    ignore: (req) => {
      const url = req.url || '';
      return url.startsWith('/uploads/')
          || url.startsWith('/css/')
          || url.startsWith('/js/')
          || url === '/favicon.ico';
    }
  },
  // Lower default request log level so successful requests don't drown
  // the actual events we care about.
  customLogLevel: (req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  serializers: {
    req: (req) => ({ id: req.id, method: req.method, url: req.url }),
    res: (res) => ({ statusCode: res.statusCode })
  }
});

module.exports = { logger, httpLogger };
